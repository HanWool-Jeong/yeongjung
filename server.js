import express from 'express';
import 'express-async-errors';
import isNaturalNumber from 'is-natural-number';
import { exec } from 'child_process';

import { get_frequency, get_latest_msg, get_time_msg, get_frequency_rank, insert_msg } from './database.js';

const app = express();

const port = 3000;
const ip = '221.167.5.173';
const project_dir = '/home/hanwool/kakaotalk-bot';

const default_latest_msg_limit = 3;
const pics_regex = /사진 [0-9]+장을 보냈습니다./;
const kakaotalk_capture_cmd = 'scrot -k --display :0 --file ~/kakaotalk-bot/img/image.png'

app.use(express.json());
app.use('/img', express.static(project_dir + '/img'));

// 메세지 & 이미지 db에 저장
app.post('/chat', async function(req, res, next)
{
    //console.log(req.body);
    const { room, name, content } = req.body;

    if (content === '사진을 보냈습니다.' || pics_regex.test(content) || content === '이모티콘을 보냈습니다.')
    {
        let img_name = `${Date.now()}.png`;

        // imagemagick앱을 이용해 카톡방 통째로 캡쳐
        exec(`scrot --display :0 --class "kakaotalk.exe" -k --file ${project_dir}/img/${img_name}`, async function(e)
        {
            if (e) next(e);
            else await insert_msg(room, name, `http://${ip}:${port}/img/` + img_name, 1);
        });
    }
    else
    {
        // 쿼리 고장나지 않게 작은 따옴표 제거
        const re = /'/g;
        const replaced = content.replace(re, '\\\'');
        await insert_msg(room, name, replaced, 0); 
    }
        
    res.send({ msg: 'ok' });
});

// 봇과 서버사이의 rtt계산
app.post('/ping', function(req, res)
{
    //console.log(req.body);
    res.send({ msg: `퐁!`});
});

// 최근메세지 가져오기
app.post('/latest_msg', async function(req, res)
{
    //console.log(req.body);
    const { room, name } = req.body;
    let { limit } = req.body;

    if (!name)
    {
        res.send({ msg: '!최근메세지: 대상이 없습니다'});
        return;
    }

    if (!limit)
    {
        limit = default_latest_msg_limit;
    }
    else
    {
        // 자연수 판별
        limit = parseInt(limit);
        if (!isNaturalNumber(limit))
        {
            res.send({ msg: '!최근메세지: 자연수를 입력하세요'});
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

app.post('/time_msg', async function(req, res)
{
    //console.log(req.body);
    const { room, name } = req.body;
    let { start, end } = req.body;

    if (!name) 
    {
        res.send({ msg: '!기간메세지: 대상이 없습니다'});
        return;
    }
    if (!start) 
    {
        res.send({ msg: '!기간메세지: 기간을 입력하세요'});
        return;
    }

    if (!end) end = start;

    // 자연수 판별
    const start_int = parseInt(start);
    const end_int = parseInt(end);
    if (!isNaturalNumber(start_int, {includeZero: true}) || !isNaturalNumber(end_int, {includeZero: true}))
    {
        res.send({ msg: '!기간메세지: 자연수 형식으로 입력하세요'});
        return;
    }
    // 다르게 입력했을 때
    if (start.length !== end.length)
    {
        res.send({ msg: '!기간메세지: 시작과 끝을 똑같은 형식으로 입력하세요' });
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

app.post('/frequency', async function(req, res) 
{
    const { room, name, target_word } = req.body;

    if (!name || !target_word)
    {
        res.send({ msg: '!빈도: 대상이 없습니다' });
        return;
    }

    let result = await get_frequency(room, name, target_word);
    result = result[0];
    let response_msg = `${name}의 ${target_word} 언급빈도: ${result.count}회`;
    res.send({ msg: response_msg });
});

app.post('/frequency_rank', async function(req, res)
{
    const { room, target_word } = req.body;

    if (!target_word)
    {
        res.send({ msg: '!빈도순위: 대상이 없습니다' });
        return;
    }

    let result = await get_frequency_rank(room, target_word);
    result = result.slice();

    let response_msg = `${target_word} 언급 순위:\n`;
    result.forEach(element => { response_msg += `${element.name} ${element.count}회\n`; });
    response_msg = response_msg.slice(0, -1);

    res.send({ msg: response_msg });
});

app.listen(port, '0.0.0.0', function()
{
    console.log(`${ip}:${port}`, '서버 가동중..');
});