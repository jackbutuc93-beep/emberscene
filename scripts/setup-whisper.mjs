// One-time setup: installs whisper.cpp and the English "small.en" model (~466 MB) locally in ./whisper.cpp
import path from "node:path";
import { downloadWhisperModel, installWhisperCpp } from "@remotion/install-whisper-cpp";

const to = path.join(process.cwd(), "whisper.cpp");
await installWhisperCpp({ to, version: "1.5.5" });
await downloadWhisperModel({ model: "small.en", folder: to });
console.log("whisper.cpp ready in", to);
