const ip = '221.167.5.173';
const port = 3000;
const server_dst = 'http://' + ip + ':' + port;

function send_post(json_data, url)
{
    // 연결설정
    const url_obj = new java.net.URL(server_dst + url);
    const connection = url_obj.openConnection();

    // post, header, output보낼꺼니깐 true
    connection.setRequestMethod('POST');
    connection.setRequestProperty('Content-Type', 'application/json');
    connection.setRequestProperty('Connection', 'close');   // 이거 없으면 계속 서버 기다려서 오류남
    connection.setDoOutput(true);

    // connection의 outputstream으로 json보내기
    var bufferedWriter = new java.io.BufferedWriter(new java.io.OutputStreamWriter(connection.getOutputStream()));
    bufferedWriter.write(JSON.stringify(json_data));
    bufferedWriter.flush();
    bufferedWriter.close();

    var responseCode = connection.getResponseCode();

    // 응답받기
    var bufferedReader = new java.io.BufferedReader(new java.io.InputStreamReader(connection.getInputStream()));
    var buffer;
    var result = '';
    while ((buffer = bufferedReader.readLine()) != null)
        result += buffer;
    bufferedReader.close();

    return JSON.parse(result);
}

// 예외처리를 포함한 쓰레드 만들기
function make_thread(func)
{
    return new java.lang.Thread({ run: () => { try { func(); } catch (e) { Log.d(e); } }});
}

function onMessage(chat)
{
    const chat_url = '/chat';
    const json_data =
    { 
        room: chat.room,
        name: chat.author.name,
        content: chat.content,
    };

    make_thread(() => { send_post(json_data, chat_url); }).start();
}

function onCommand(chat)
{
    let json_data = {}, target_url;

    if (chat.command === '핑')
    {
        target_url = '/ping';
        const ping = Date.now();
        
        make_thread(() =>
        {
            send_post(json_data, target_url); 
            const pong = Date.now();
            chat.reply(`퐁! ${pong - ping}ms`);
        }).start();
    }
    else if (chat.command === '최근메세지')
    {
        target_url = '/latest_msg';
        json_data.room = chat.room;
        json_data.name = chat.args[0];
        json_data.limit = chat.args[1];

        make_thread(() => 
        {
            const result = send_post(json_data, target_url);
            chat.reply(result.msg);
        }).start();
    }
    else if (chat.command === '기간메세지')
    {
        target_url = '/time_msg';
        json_data.room = chat.room;
        json_data.name = chat.args[0];
        json_data.start = chat.args[1];
        json_data.end = chat.args[2];

        make_thread(() => 
        {
            const result = send_post(json_data, target_url);
            chat.reply(result.msg);
        }).start();
    }
    else if (chat.command === '빈도')
    {
        target_url = '/frequency';
        json_data.room = chat.room;
        json_data.name = chat.args[0];
        json_data.target_word = chat.args[1];

        make_thread(() => 
        {
            const result = send_post(json_data, target_url);
            chat.reply(result.msg);
        }).start();
    }
    else if (chat.command === '빈도순위')
    {
        target_url = '/frequency_rank';
        json_data.room = chat.room;
        json_data.target_word = chat.args[0];

        make_thread(() => 
        {
            const result = send_post(json_data, target_url);
            chat.reply(result.msg);
        }).start();
    }
}

let bot = BotManager.getCurrentBot();
bot.setCommandPrefix('!');
bot.addListener(Event.COMMAND, onCommand);
bot.addListener(Event.MESSAGE, onMessage);