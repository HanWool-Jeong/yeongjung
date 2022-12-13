import mariadb from 'mariadb';

const db_config = {
    host: 'localhost',
    port: 3306,
    user: 'kakaotalk-bot',
    password: '2341',
    db: 'kakaotalk_bot_db',
    table: 'chats'
}

// db서버 안열리면 프로세스 죽이게 이건 예외처리 하지 말자
const pool = mariadb.createPool({
    host: db_config.host,
    port: db_config.port,
    user: db_config.user,
    password: db_config.password
});

export async function get_latest_msg(name, room, limit) {
    let query_statement = `
        SELECT content FROM (
            SELECT * FROM ${db_config.table} 
            WHERE name='${name}' AND room='${room}'
            ORDER BY id DESC
            LIMIT ${limit}
        ) as inline_view
        ORDER BY id ASC;
        `;

    let connection = await pool.getConnection();
    await connection.query(`USE ${db_config.db}`);
    let result = await connection.query(query_statement);

    if (connection) connection.end();
    return result;
}

export async function insert_msg(room, name, content, isImage) {
    let query_statement = `
        INSERT INTO ${db_config.table}
        (room, name, content, isImage) VALUES
        ('${room}', '${name}', '${content}', '${isImage}');
    `;

    let connection = await pool.getConnection();
    await connection.query(`USE ${db_config.db}`);
    let result = await connection.query(query_statement);

    if (connection) connection.end();
    return result;
}