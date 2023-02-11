import mariadb from 'mariadb';

const db_config = {
    host: 'localhost',
    port: 3306,
    user: 'kakaotalk_bot',
    password: '2341',
    db: 'kakaotalk_bot_db',
    table: 'chats'
};

// db서버 안열리면 프로세스 죽이게 이건 예외처리 하지 말자
const pool = mariadb.createPool({
    host: db_config.host,
    port: db_config.port,
    user: db_config.user,
    password: db_config.password,
    charset: 'utf8mb4'
});

async function query(query_statement) {
    let connection = await pool.getConnection();
    await connection.query(`USE ${db_config.db}`);
    let result = await connection.query(query_statement);

    if (connection) connection.end();
    return result;
}

export async function get_latest_msg(room, name, limit) { 
    let query_statement = `
        SELECT content FROM (
            SELECT * FROM ${db_config.table} 
            WHERE name='${name}' AND room='${room}'
            ORDER BY id DESC
            LIMIT ${limit}
        ) AS inline_view
        ORDER BY id ASC;
    `;

    return await query(query_statement);
}

export async function insert_msg(room, name, content, isImage) {
    let query_statement = `
        INSERT INTO ${db_config.table}
        (room, name, content, isImage) VALUES
        ('${room}', '${name}', '${content}', '${isImage}');
    `;

    return await query(query_statement);
}

export async function get_time_msg(room, name, start, end) {
    let query_statement = `
        SELECT content FROM ${db_config.table}
        WHERE name='${name}' AND room='${room}' AND
        DATE_FORMAT(time, '%Y%m%d%H%i')
        BETWEEN ${start} AND ${end}
    `;

    return await query(query_statement);
}

export async function get_frequency(room, name, target_word) {
    let query_statement = `
        SELECT COUNT(*) AS count FROM ${db_config.table}
        WHERE room='${room}' AND name='${name}' AND
        content LIKE '%${target_word}%';
    `;

    return await query(query_statement);
}

export async function get_frequency_rank(room, target_word) {
    let query_statement = `
        SELECT name, COUNT(*) AS count FROM ${db_config.table}
        WHERE room='${room}' AND
        content LIKE '%${target_word}%'
        GROUP BY name
        ORDER BY count DESC;
    `;

    return await query(query_statement);
}
