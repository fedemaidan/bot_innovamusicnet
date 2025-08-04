const KeepaConfigService = require("../../Utiles/KeepaConfigService");
const { getInputWebSearch } = require("../../Utiles/Mensajes/mensajesMariano");
const openai = require("../Chatgpt/openai");
const { OpenAI } = require("openai");

function limpiarJson(str) {
  return str.replace(/```json\n?|```\n?/g, "").trim();
}

async function getByChatgpt4Vision(
  urlsImagenesFacturas,
  prompt,
  temperature = 0.2
) {
  const content = [{ type: "text", text: prompt }];

  for (i in urlsImagenesFacturas) {
    const urlImagenFactura = urlsImagenesFacturas[i];
    const obj = {
      type: "image_url",
      image_url: {
        url: urlImagenFactura,
      },
    };
    content.push(obj);
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    // response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: content,
      },
    ],
    temperature: temperature,
  });
  return limpiarJson(response.choices[0].message.content);
}

async function getByChatgpt35TurboByText(prompt) {
  const response = await openai.chat.completions.create({
    messages: [{ role: "system", content: prompt }],
    model: "gpt-3.5-turbo",
    temperature: 0.2,
  });
  return limpiarJson(response.choices[0].message.content);
}

async function getByChatGpt4o(prompt) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // 🔥 Mejor rendimiento y costo
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 10000,
      response_format: { type: "json_object" },
    });
    return limpiarJson(response.choices[0].message.content);
  } catch (error) {
    console.error("Error en OpenAI:", error);
    return null;
  }
}

const marianoOpenai = new OpenAI({
  apiKey: process.env.MARIANO_OPENAI_API_KEY,
});

async function getProductByWebSearch(titulos, linksAmazon) {
  const keepaConfig = await KeepaConfigService.obtenerConfiguracion();
  const promptId = keepaConfig.PROMPT_ID;
  const version = keepaConfig.VERSION?.toString() ?? "11";

  const input = getInputWebSearch(titulos, linksAmazon);

  console.log("messagePromptMariano", input);
  try {
    const response = await marianoOpenai.responses.create({
      prompt: {
        id: "pmpt_687e93c54b1c8190a37883ffe6b4e7ea0ba3cf35d12c4773",
        version: "11",
      },
      input,
    });
    console.log("responsePromptMariano", response);
    return response.output_text;
  } catch (error) {
    console.error("Error al usar prompt con ID:", error);
    return null;
  }
}

module.exports = {
  getByChatgpt35TurboByText,
  getByChatgpt4Vision,
  getByChatGpt4o,
  getProductByWebSearch,
};
