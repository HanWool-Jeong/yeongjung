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
        model: "gpt-3.5-turbo",
        messages: prompt
    });

    return completion.data;
}