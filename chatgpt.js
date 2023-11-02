import dotenv from 'dotenv';
import { Configuration, OpenAIApi } from "openai";
import { project_dir } from "./global_variables.js";

dotenv.config({ path : `${project_dir}/.env` });

export async function talking(prompt) {
    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const openai = new OpenAIApi(configuration);

    const completion = await openai.createChatCompletion({
        model: "gpt-4",
        messages: prompt
    });

    return completion.data;
}


// GPT 3.5버전 엔진: gpt-3.5-turbo
// 만약 gpt-4로 바꾸면 max token수 늘어나니 데이터베이스 content VARCHAR량 늘려야함!!!!
// gpt-4는 8192토큰까지 가능 하지만 비싸서 4096까지만 global_variables.js에 해놓음
