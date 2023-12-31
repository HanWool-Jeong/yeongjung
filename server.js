import express from 'express';
import 'express-async-errors';
import isNaturalNumber from 'is-natural-number';
import { exec } from 'child_process';

import { get_frequency, get_latest_msg, get_time_msg, get_frequency_rank, insert_msg, insert_gpt_msg, recall_prev_chats, recall_prev_tokens } from './database.js';
import { SqlError } from 'mariadb';
import { CommandError, ImageSaveFailedError } from './error.js';
import { port, ip, project_dir, recall_gpt_max_tokens } from './global_variables.js';
import { talking } from './chatgpt.js';

const app = express();

const command_prefix = '!';
const default_latest_msg_limit = 3;
const pics_regex = /사진 [0-9]+장을 보냈습니다./;
const sharp_search_regex = /샵검색 :/;
const pc_emo_reply = /이모티콘/;
const ph_emo_reply = /(이모티콘)/;

//const kakaotalk_window_W = 475;
//const kakaotalk_window_H = 800;
//const kakaotalk_window_X = 1920 - kakaotalk_window_W;
//const kakaotalk_window_Y = 1;
//const kakaotalk_capture_cmd1 = `scrot --display :0 -a ${kakaotalk_window_X},${kakaotalk_window_Y},${kakaotalk_window_W},${kakaotalk_window_H} --file ${project_dir}/img/${img_name}`;
//const kakaotalk_capture_cmd2 = `scrot --display :0 --class "kakaotalk.exe" -k --file ${project_dir}/img/${img_name}`
//const kakaotalk_capture_cmd = `scrot --file ${project_dir}/img/${img_name} -u`;

const whitelist = [ '정한울', '황현성', '영중이' ];

app.use(express.json());
app.use('/img', express.static(project_dir + '/img'));

// 메세지 & 이미지 db에 저장
app.post('/chat', async function(req, res, next) {
    //console.log(req.body);
    const { room, name, content } = req.body;

    //if (content === '사진을 보냈습니다.' || pics_regex.test(content) || content === '이모티콘을 보냈습니다.' || sharp_search_regex.test(content) || pc_emo_reply.test(content) || ph_emo_reply.test(content)) {
    //    if (room !== '배내골' && room !== '정한울') {
    //        await insert_msg(room, name, content, 0); 
    //        res.send({ msg: 'ok' });
    //        return;
    //    }

    //    let img_name = `${Date.now()}.png`;
    //    const kakaotalk_capture_cmd = `sleep 1 && scrot --display :0 --file ${project_dir}/img/${img_name} -u`;

    //    // scort을 이용해 카톡방 통째로 캡쳐
    //    exec(kakaotalk_capture_cmd, async function(e) {
    //        if (e) {
    //            next(new ImageSaveFailedError(e.message));
    //            return;
    //        }
    //        else await insert_msg(room, name, `http://${ip}:${port}/img/` + img_name, 1);
    //    });
    //}
    //else {
    //    // 쿼리 고장나지 않게 작은 따옴표 제거
    //    const re = /'/g;
    //    const replaced = content.replace(re, '\\\'');
    //    await insert_msg(room, name, replaced, 0); 
    //}

	// 쿼리 고장나지 않게 작은 따옴표 제거
	const re = /'/g;
	const replaced = content.replace(re, '\\\'');
	await insert_msg(room, name, replaced, 0); 
        
    res.send({ msg: 'ok' });
});

// 봇과 서버사이의 rtt계산
const command_ping = '핑';
app.post('/ping', function(req, res) {
    //console.log(req.body);
    res.send({ msg: `퐁!`});
});

const command_latest_msg = '최근메세지';
app.post('/latest_msg', async function(req, res, next) {
    //console.log(req.body);
    let error = new CommandError(command_prefix + command_latest_msg + ": ");
    const { room, name } = req.body;
    let { limit } = req.body;

    if (whitelist.includes(name))
        return;

    if (!name) {
        error.message += "대상이 없습니다";
        next(error);
        return;
    }

    if (!limit) {
        limit = default_latest_msg_limit;
    }
    else {
        // 자연수 판별
        limit = parseInt(limit);
        if (!isNaturalNumber(limit)) {
            error.message += "자연수를 입력하세요";
            next(error);
            return;
        }
    }

    let result = await get_latest_msg(room, name, limit);
    result = result.slice();

    let response_msg = `${name}의 최근메세지 ${limit}개:\n`;
    result.forEach(element => { response_msg += `[ ${element.content} ]\n`; });
    response_msg = response_msg.slice(0, -1);

    res.send({ msg: response_msg });
});

const command_time_msg = '기간메세지';
app.post('/time_msg', async function(req, res, next) {
    //console.log(req.body);
    let error = new CommandError(command_prefix + command_time_msg + ": ");
    const { room, name } = req.body;
    let { start, end } = req.body;

    if (whitelist.includes(name))
        return;

    if (!name)  {
        error.message += "대상이 없습니다";
        next(error);
        return;
    }
    if (!start) {
        error.message += "기간을 입력하세요";
        next(error);
        return;
    }

    if (!end) end = start;

    // 자연수 판별
    const start_int = parseInt(start);
    const end_int = parseInt(end);
    if (!isNaturalNumber(start_int, {includeZero: true}) || !isNaturalNumber(end_int, {includeZero: true})) {
        error.message += "자연수 형식으로 입력하세요";
        next(error);
        return;
    }
    // 다르게 입력했을 때
    if (start.length !== end.length) {
        error.message += "시작과 끝을 똑같은 형식으로 입력하세요";
        next(error);
        return;
    }

    // 날짜 포맷은 항상 12자리 자연수이기 때문에 날짜 prefix 생성해서 달아준다
    const date = new Date();
    let prefix = "";
    
    if (start.length === 2)
        prefix = `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}${date.getHours()}`;
    else if (start.length === 4)
        prefix = `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`;
    else if (start.length === 6)
        prefix = `${date.getFullYear()}${date.getMonth() + 1}`;
    else if (start.length === 8)
        prefix = `${date.getFullYear()}`;

    start = prefix + start;
    end = prefix + end;

    let result = await get_time_msg(room, name, start, end);
    result = result.slice();

    let response_msg = `${name}의 기간메세지:\n`;
    result.forEach(element => { response_msg += `[ ${element.content} ]\n`; });
    response_msg = response_msg.slice(0, -1);

    res.send({ msg: response_msg });
});

const command_frequency = '빈도';
app.post('/frequency', async function(req, res, next) {
    //console.log(req.body);
    let error = new CommandError(command_prefix + command_frequency + ": ");
    const { room, name, target_word } = req.body;

    if (!name || !target_word) {
        error.message += "대상이 없습니다";
        next(error);
        return;
    }

    let result = await get_frequency(room, name, target_word);
    result = result[0];
    let response_msg = `${name}의 ${target_word} 언급빈도: ${result.count}회`;
    res.send({ msg: response_msg });
});

const command_frequency_rank = '빈도순위';
app.post('/frequency_rank', async function(req, res, next) {
    //console.log(req.body);
    let error = new CommandError(command_prefix + command_frequency_rank + ": ");
    const { room, target_word } = req.body;

    if (!target_word) {
        error.message += "대상이 없습니다";
        next(error);
        return;
    }

    let result = await get_frequency_rank(room, target_word);
    result = result.slice();

    let response_msg = `${target_word} 언급 순위:\n`;
    result.forEach(element => { response_msg += `${element.name} ${element.count}회\n`; });
    response_msg = response_msg.slice(0, -1);

    res.send({ msg: response_msg });
});

const command_talking = "영중아";
app.post('/talking', async function(req, res) {
    const re = /'/g;
    const { room, name } = req.body;
    let { prompt } = req.body;
    
    const chats = await recall_prev_chats(room, recall_gpt_max_tokens);
    const prev_tokens = await recall_prev_tokens(room, recall_gpt_max_tokens);
    chats.push({role: 'user', content: prompt});
    //console.log(chats);
    //console.log(prev_tokens);

    const reply = await talking(chats);
    let reply_content = reply.choices[0].message.content.trim();
    //const reply_prompt_tokens = reply.usage.prompt_tokens;
    const reply_completion_tokens = reply.usage.completion_tokens;
    const reply_total_tokens = reply.usage.total_tokens;
    //console.log(reply.usage);

    prompt = prompt.replace(re, '\\\'');
    await insert_gpt_msg(room, name, 'user', reply_total_tokens - prev_tokens - reply_completion_tokens, prompt);

    res.send({ msg: reply_content });

    reply_content = reply_content.replace(re, '\\\'');
    await insert_gpt_msg(room, name, 'assistant', reply_completion_tokens, reply_content);
});

// 예외처리
const too_long_msg = /Data too long for column/;
app.use(function (error, req, res, next) {
    if (error instanceof SqlError) {
        if (too_long_msg.test(error.message)) {
            const { room, name } = req.body;

            // 넣을 문장이 너무 길면 캡쳐한다
            let img_name = `${Date.now()}.png`;
            const kakaotalk_capture_cmd = `sleep 1 && scrot --display :0 --file ${project_dir}/img/${img_name} -u`;

            exec(kakaotalk_capture_cmd, async function(e) {
                if (e) {
                    res.send({ msg: "긴 문장 캡쳐 실패" });
                    next(new ImageSaveFailedError("긴 문장 캡쳐 실패\n" + e.message));
                }
                else await insert_msg(room, name, `http://${ip}:${port}/img/` + img_name, 1);
            });

            res.send({ msg: 'ok' });
        }
        else {
            //res.send({ msg: "데이터베이스 실패" });
            next(error);
        }
    }
    else if (error instanceof CommandError) {
        res.send({ msg: error.message });
    }
    else if (error instanceof ImageSaveFailedError) {
		console.log(error.message);
        //res.send({ msg: "이미지 저장 실패" });
        next(error);
    }
    else {
        //res.send({ msg: "알 수 없는 오류"});
        next(error);
    }
});

app.listen(port, '0.0.0.0', function() {
    console.log(`*:${port}`, '서버 가동중..');
});
