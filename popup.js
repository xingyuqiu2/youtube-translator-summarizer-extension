import { getActiveTabURL } from "./utils.js";

const saveConfiguration = async () => {
  console.log("save button clicked");
  const activeTab = await getActiveTabURL();
  const queryParameters = activeTab.url.split("?")[1];
  const urlParameters = new URLSearchParams(queryParameters);

  const currentVideo = urlParameters.get("v");

  const rapid_key = document.getElementById("rapid-input").value;
  const gpt_key = document.getElementById("gpt-input").value;
  const language = document.getElementById("language-select").value;
  const mode = document.getElementById("summary-select").value;

  if (rapid_key.length !== 0) {
    chrome.storage.sync.set({["RapidKey"]: JSON.stringify(rapid_key)});
  }

  if (gpt_key.length !== 0) {
    chrome.storage.sync.set({["GPTKey"]: JSON.stringify(gpt_key)});
  }

  if (language.length !== 0) {
    chrome.storage.sync.set({["Language"]: JSON.stringify(language)});
  }

  if (mode.length !== 0) {
    var temp = 0.9;
    if (mode === "Precise") {
      temp = 0.3;
    } else if (mode === "Balanced"){
      temp = 0.6;
    }
    console.log(temp);
    chrome.storage.sync.set({["Mode"]: temp});
  }

  chrome.tabs.sendMessage(activeTab.id, {
    type: "RELOAD",
    videoId: currentVideo,
  });

};


document.addEventListener("DOMContentLoaded", async () => {
  console.log('process begin');

  const save_btn = document.getElementById("extension-save");
  save_btn.addEventListener('click', saveConfiguration, false);

  const activeTab = await getActiveTabURL();
  const queryParameters = activeTab.url.split("?")[1];
  const urlParameters = new URLSearchParams(queryParameters);

  const currentVideo = urlParameters.get("v");
  console.log('vid=' + currentVideo);

  if (activeTab.url.includes("youtube.com/watch") && currentVideo) {
    //current page is a youtube page
    chrome.tabs.sendMessage(activeTab.id, {
      type: "LOAD",
      videoId: currentVideo,
    });


  } else {
    //current page is not a youtube page
    const container = document.getElementsByClassName("container")[0];
    container.innerHTML = '<div class="title">This is not a youtube page.</div>';
  }
});

