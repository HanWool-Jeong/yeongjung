import mariadb from 'mariadb';

const db_config = {
    host: 'localhost',
    port: 3306,
    user: 'katalk',
    password: '2341',
    db: 'kakaotalk_bot',
    table: 'messages'
}

const pool = mariadb.createPool({
    host: db_config.host,
    port: db_config.port,
    user: db_config.user,
    password: db_config.password
});

export async function get_latest_msg(name, limit) {
    let query_statement = `
        SELECT msg FROM (
            SELECT * FROM ${db_config.table} 
            WHERE name='${name}' 
            ORDER BY id DESC
            LIMIT ${limit}
        ) as inline_view
        ORDER BY id ASC;
        `;

    let connection, result;
    try {
        connection = await pool.getConnection();
        await connection.query(`USE ${db_config.db}`);
        result = await connection.query(query_statement);
    } catch(err) {
        console.log('db 실패: ', err);
    } finally {
        if (connection) connection.end();
        return result;
    }
}

export async function insert_msg(name, msg) {
    let query_statement = `
        INSERT INTO ${db_config.table}
        (name, msg) VALUES
        ('${name}', '${msg}');
    `;

    let connection, result;
    try {
        connection = await pool.getConnection();
        await connection.query(`USE ${db_config.db}`);
        result = await connection.query(query_statement);
    } catch(err) {
        console.log('db 실패: ', err);
    } finally {
        if (connection) connection.end();
        return result;
    }
}