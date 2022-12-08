import express from 'express';

import { get_latest_msg, insert_msg } from './database.js';

const app = express();
app.use(express.json());

const cmd_prefix = '!';
const default_latest_msg_limit = 3;

app.post('/', async function(req, res) {
    //console.log(req.body);
    const { room, sender, msg } = req.body;

    if (!msg.startsWith(cmd_prefix)) {
        res.send({ msg: 'ok' });

        insert_msg(sender, msg);
        //if (sender !== '정한울')
        //    insert_msg(sender, msg);

        return;
    }

    const args = msg.split(' ');
    const cmd = args.shift()?.slice(cmd_prefix.length);
    
    if (cmd === '핑') {
        res.send({ msg: '퐁' });
    }
    else if (cmd === '최근메세지') {
        if (!args[0]) return;
        if (!args[1]) args[1] = default_latest_msg_limit;

        let result;
        try {
            result = await get_latest_msg(args[0], args[1]);
            result = result.slice();

            let response_msg = `${args[0]}의 최근메세지 ${args[1]}개:\n`;
            result.forEach(element => { response_msg += `[ ${element.msg} ]\n`; });
            response_msg = response_msg.slice(0, -1);

            res.send({ msg: response_msg });

        } catch(err) {
            console.log('최근메세지 실패: ', err);
        }
    }
});

const port = 3000;
const ip = 'localhost';
app.listen(port, '0.0.0.0', function() {
    console.log(`${ip}:${port}`, '서버 가동중..');
});