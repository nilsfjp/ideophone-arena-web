import { backendUrl } from "./api/client";
import type { IdeophoneOption } from "./api/types";

export function resolveStimulusSource(option: IdeophoneOption) {
  if (option.stimulusUrl) {
    return backendUrl(option.stimulusUrl);
  }

  if (!option.stimulusFile) {
    return undefined;
  }

  const stimulusPath = option.stimulusFile.startsWith("/stimuli/")
    ? option.stimulusFile
    : `/stimuli/${option.stimulusFile.replace(/^\/+/, "")}`;

  return backendUrl(stimulusPath);
}
