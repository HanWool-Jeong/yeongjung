const ip = '221.167.5.173';
const port = 3000;
const index_url = '/';
const chat_url = '/chat';
const img_url = '/img';
const server_dst = 'http://' + ip + ':' + port;

function send_post(json_data, url) {
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
    while ((buffer = bufferedReader.readLine()) != null) {
        result += buffer;
    }
    bufferedReader.close();

    return JSON.parse(result);
}

function onMessage(chat) {
    const json_data = {
        room: chat.room,
        name: chat.author.name,
        content: chat.content,
    };
    
    // 네트워크 기능은 안드로이드에서 메인 쓰레드에서 실행이 불가능하다..
    new java.lang.Thread({
        run: () => {
            try {
                const result = send_post(json_data, chat_url);

                if (result !== 'ok')
                    chat.reply(result.msg);
            }
            catch (e) {
                chat.reply(e);
            }
        }
    }).start();
}

let bot = BotManager.getCurrentBot();
bot.addListener(Event.MESSAGE, onMessage);