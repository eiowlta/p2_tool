import { Locale } from "../util/encoding";
import {
  Message,
  MessageScriptContext,
  messageToString,
  parseMessage,
} from "./msg";
export interface MessageFile {
  comments: string[];
  messages: Record<string, Message>;
  order: string[];
}
export const writeMessageFile = (
  file: MessageFile,
  context: MessageScriptContext
) => {
  let lines = [];
  lines.push(file.comments[0]);
  for (let i = 0; i < file.order.length; i++) {
    lines.push(`${file.order[i]}:`);
    lines.push(
      messageToString(file.messages[file.order[i]], context) + "[end]"
    );
    lines.push(file.comments[i + 1]);
  }
  return lines.join("\n");
};
export const parseMessageFile = (
  text: string,
  context: MessageScriptContext
): MessageFile => {
  let lines = text.split("\n");
  let comments = [];
  let messages: Record<string, Message> = {};
  let order: string[] = [];
  let current_comment: string[] = [];
  let currentLine = 0;
  const getNextLine = () => {
    if (lines.length) {
      currentLine++;
      return lines.shift()!;
    }
    throw `Unexpected end of message file ${context.file} at ${currentLine}`;
  };
  while (lines.length) {
    let line = getNextLine();
    if (line.trim().endsWith(":") && !line.startsWith("#")) {
      //found message;
      comments.push(current_comment.join("\n"));
      current_comment = [];
      let name = line.trim().replace(":", "");
      let line_start = currentLine + 1;
      let currentMessage = [];
      while (!line.trimEnd().endsWith("[end]")) {
        line = getNextLine();
        currentMessage.push(line);
      }
      let msg = parseMessage(currentMessage.join("\n"), {
        ...context,
        base: line_start,
      });
      order.push(name);
      if (messages[name] !== undefined)
        throw `Duplicate message ${name} in ${context.file}`;
      messages[name] = msg;
    } else {
      current_comment.push(line);
      if (line.trim() != "" && !line.trim().startsWith("#")) {
        console.warn(
          `Found stray text in ${context.file}:${currentLine}\n${line}`
        );
      }
    }
  }
  comments.push(current_comment.join("\n"));
  return {
    comments,
    messages,
    order,
  };
};
