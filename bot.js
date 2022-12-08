const url = 'http://221.167.5.173:3000';
const method = 'POST';

/**
 * 메세지 왔을 때 콜백
 * @param {string} room 
 * @param {string} msg 
 * @param {string} sender 
 * @param {boolean} isGroupChat 
 * @param {void}    replier.reply(rmsg),
 *        {boolean} replier.reply(room, message, hideErrorToast=false)
 * @param {string} imageDB.getProfileBase64() 
 * @param {string} packageName 
 */
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    // 받은 메세지를 json으로 만들기
    const json_data = {
        room: room,
        sender: sender,
        msg: msg
    };

    // 연결설정
    const url_obj = new java.net.URL(ip);
    const connection = url_obj.openConnection();

    // post, header, output보낼꺼니깐 true
    connection.setRequestMethod(method);
    connection.setRequestProperty('Content-Type', 'application/json');
    connection.setDoOutput(true);

    // connection의 outputstream으로 json보내기
    var bufferedWriter = new java.io.BufferedWriter(new java.io.OutputStreamWriter(connection.getOutputStream()));
    bufferedWriter.write(JSON.stringify(json_data));
    bufferedWriter.flush();
    bufferedWriter.close();

    // 응답코드
    var responseCode = connection.getResponseCode();
    //Log.d(responseCode);

    // 응답받기
    var bufferedReader = new java.io.BufferedReader(new java.io.InputStreamReader(connection.getInputStream()));
    var buffer;
    var result = '';
    while ((buffer = bufferedReader.readLine()) != null) {
        result += buffer;
    }
    bufferedReader.close();
    result = JSON.parse(result);
    //Log.d(result);

    // 응답 보내기
    if (result.msg !== 'ok')
        replier.reply(result.msg);
}