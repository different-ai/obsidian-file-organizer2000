import { requestUrl } from "obsidian";
import { logMessage } from "../../utils";

async function predictFolder(
  content: string,
  folders: string[],
  { baseUrl, apiKey }
) {
  const endpoint = "api/folders";
  const url = `${baseUrl}/${endpoint}`;

  const response = await requestUrl({
    url: url,
    method: "POST",
    body: JSON.stringify({ document: content, folders: folders }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const result = await response.json;
  logMessage(result.choices[0].message.content);
  return result.choices[0].message.content.trim();
}

export default predictFolder;
