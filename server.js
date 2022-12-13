import express from 'express';
import 'express-async-errors';
import isNaturalNumber from 'is-natural-number';
import { exec } from 'child_process';

import { get_latest_msg, insert_msg } from './database.js';

const app = express();
app.use(express.json());

const port = 3000;
const ip = '221.167.5.173';

const cmd_prefix = '!';
const default_latest_msg_limit = 3;
const kakaotalk_window_id = '0x3400037';
const pics_regex = /사진 [0-9]+장을 보냈습니다./;

app.use('/img', express.static('./img'));

app.post('/chat', async function(req, res) {
    console.log(req.body);
    const { room, name, content } = req.body;

    if (content === '사진을 보냈습니다.' || pics_regex.test(content) || content === '이모티콘을 보냈습니다.') {
        let img_name = `${Date.now()}.png`;

        exec(`import -window ${kakaotalk_window_id} ./img/${img_name}`, (error, stdout, stderr) => {
            if (error) {
                console.log('에러: ' + error);
            }
        });
        
        await insert_msg(room, name, `사진: http://${ip}:${port}/img/` + img_name, 1);
        res.send({ msg: 'ok' });
        return;
    }

    //if (name !== '정한울')
    //    await insert_msg(name, msg);
    await insert_msg(room, name, content, 0); 

    if (!content.startsWith(cmd_prefix)) {
        res.send({ msg: 'ok' });
        return;
    }

    const args = content.split(' ');
    const cmd = args.shift()?.slice(cmd_prefix.length);
    
    if (cmd === '핑') {
        const ms = Date.now() - req.body.ping;
        res.send({ msg: `퐁! ${ms}ms`});
    }
    else if (cmd === '최근메세지') {
        if (!args[0]) {
            res.send({ msg: '!최근메세지: 대상이 없습니다'});
            return;
        }

        // 자연수 판별
        if (!args[1]) {
            args[1] = default_latest_msg_limit;
        }
        args[1] = parseInt(args[1]);
        if (!isNaturalNumber(args[1])) {
            res.send({ msg: '!최근메세지: 자연수를 입력하세요'});
            return;
        }

        let result = await get_latest_msg(args[0], room, args[1]);
        result = result.slice();

        let response_msg = `${args[0]}의 최근메세지 ${args[1]}개:\n`;
        result.forEach(element => { response_msg += `[ ${element.content} ]\n`; });
        response_msg = response_msg.slice(0, -1);

        res.send({ msg: response_msg });
    }
    else {
        res.send({ msg: `!${cmd}: 명령어가 없습니다` });
    }
});

app.listen(port, '0.0.0.0', function() {
    console.log(`${ip}:${port}`, '서버 가동중..');
});