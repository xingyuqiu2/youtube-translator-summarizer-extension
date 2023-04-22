(() => {
  const loadExtension = async () => {
    var extensionCon = document.getElementById("extension-container");
    if (extensionCon) {
      return;
    }
    //init extention in the relate part
    console.log('init extension');

    extensionCon = document.createElement("div");
    extensionCon.id = "extension-container";
    const headerCon = document.createElement("div");
    headerCon.id = "header-container";

    const icon = document.createElement("img");
    icon.src = chrome.runtime.getURL("assets/ext-icon.png");
    icon.title = "ext-icon";
    icon.className = "extension-icon"

    const title = document.createElement("p");
    title.textContent = "YouTube Translator & Summarizer"
    title.className = "extension-title"

    const tab = document.createElement("div");
    tab.className = "tab"
    const transcriptTab = document.createElement("button");
    transcriptTab.className = "tablinks active"
    transcriptTab.textContent = "Transcript"
    transcriptTab.id = "transcript-btn"

    const translationTab = document.createElement("button");
    translationTab.className = "tablinks"
    translationTab.textContent = "Translation"
    translationTab.id = "translations-btn"

    const summaryTab = document.createElement("button");
    summaryTab.className = "tablinks"
    summaryTab.textContent = "Summary"
    summaryTab.id = "summary-btn"

    transcriptTab.addEventListener('click', openTranscriptTab, false);
    translationTab.addEventListener('click', openTranslationsTab, false);
    summaryTab.addEventListener('click', openSummaryTab, false);

    const transcriptCon = document.createElement("div");
    transcriptCon.className = "tabcontent"
    transcriptCon.style.display = "block"
    transcriptCon.id = "transcript-container";


    const translationCon = document.createElement("div");
    translationCon.className = "tabcontent"
    translationCon.id = "translations-container";

    const summaryCon = document.createElement("div");
    summaryCon.className = "tabcontent"
    summaryCon.id = "summary-container";

    tab.appendChild(transcriptTab)
    tab.appendChild(translationTab)
    tab.appendChild(summaryTab)

    headerCon.appendChild(icon)
    headerCon.appendChild(title)
    extensionCon.appendChild(headerCon)
    extensionCon.appendChild(tab)
    extensionCon.appendChild(transcriptCon)
    extensionCon.appendChild(translationCon)
    extensionCon.appendChild(summaryCon)

    var relatedElement = document.getElementById("related");
    relatedElement.prepend(extensionCon);

    // transcriptTab.onclick()

  };

  const processTranscript = async (apiResponse=[]) => {
    // let translationsElement = document.getElementById("translations");
    // translationsElement.innerHTML = "";
    if (apiResponse.length > 0) {
      let processedTranscript = [];
      for (let i = 0; i < apiResponse.length; i++) {
        //for each translation
        let translation = apiResponse[i];
        translation.text = translation.text.replace(/\s+/g, ' ').trim();
        while (translation.text.slice(-1) !== "." && translation.dur < 120 && translation.text.length < 1000) {
          //if last char of text is not . and both the duration and length of the translation are not enough
          //then we should concatenate
          i++;
          if (i < apiResponse.length) {
            //next translation exists
            let nextTranslation = apiResponse[i];
            if (nextTranslation.start - translation.end > 5) {
              //if interval is too large between two translations, then we should not concatenate
              break;
            }
            translation.end = nextTranslation.end;
            translation.dur += nextTranslation.end - translation.start;
            translation.text += ' ' + nextTranslation.text.replace(/\s+/g, ' ').trim();
          } else {
            //next translation does not exist
            break;
          }
        }
        processedTranscript.push(translation);
        loadTranscript(translation);
      }
      chrome.storage.local.set({'Processed_Transcript': JSON.stringify(processedTranscript)});
    } 
    // else {
    //   translationsElement.innerHTML = '<i class="row">No translations to show</i>';
    // }
    return;
  };

  const fetchTranscript = async (videoId, config) => {
    chrome.storage.sync.get(["videoId"]).then((result) => {
      if (!result["videoId"] || videoId !== JSON.parse(result["videoId"])) {
        chrome.storage.sync.set({["videoId"]: JSON.stringify(videoId)});
        const options = {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': config["RapidKey"],
            'X-RapidAPI-Host': 'subtitles-for-youtube.p.rapidapi.com'
          }
        };
        console.log("video id is " + videoId);
        fetch('https://subtitles-for-youtube.p.rapidapi.com/subtitles/' + videoId, options)
          .then(response => {
            if (response.ok) {
              chrome.storage.local.set({["APIError"]: 0});
              return response.json();
            } else {
              alert("Please set correct rapid api key in configuration.");
              chrome.storage.local.set({["APIError"]: 2});
              throw new Error('rapid api not correct');
            }
          })
          .then(response => {
            chrome.storage.local.set({["Original_Transcript"]: JSON.stringify(response)});
            processTranscript(response);
          })
          .catch(err => alert("Please set correct rapid api key in configuration."));
      } else {
        chrome.storage.local.get(["Processed_Transcript"]).then((result) => {
          console.log("loading stored transcript");
          const transcripts = JSON.parse(result["Processed_Transcript"]);
          var i;
          for (i = 0; i < transcripts.length; i++) {
            loadTranscript(transcripts[i]);
          }
        });
      }
    });
  };


  //load elements for translation
  const loadTranscript = async (transcript) => {
    var containerElement = document.getElementById("transcript-container");
    if (!containerElement) {
      console.log('transcript container missing');
      return;
    }
    const transcriptTitleElement = document.createElement("div");
    const controlsElement = document.createElement("div");
    const newTranscriptElement = document.createElement("div");

    transcriptTitleElement.textContent = transcript.text.replaceAll("&#39;", "'");
    transcriptTitleElement.className = "transcript-title";
    controlsElement.className = "transcript-controls";

    setTranslationAttributes(transcript.start, onPlay, controlsElement);

    newTranscriptElement.id = "transcript-" + transcript.start;
    newTranscriptElement.className = "transcript";
    newTranscriptElement.setAttribute("timestamp", transcript.start);

    newTranscriptElement.appendChild(controlsElement);
    newTranscriptElement.appendChild(transcriptTitleElement);
    containerElement.appendChild(newTranscriptElement);
  };

  const loadTranslation = async (response) => {

    var containerElement = document.getElementById("translations-container");
    if (!containerElement) {
      console.log('translation container missing');
      return;
    }
    const transcriptTitleElement = document.createElement("div");
    const controlsElement = document.createElement("div");
    const newTranscriptElement = document.createElement("div");

    const startTime = response.startTime;

    transcriptTitleElement.textContent = response.translation;
    transcriptTitleElement.className = "transcript-title";
    controlsElement.className = "transcript-controls";

    setTranslationAttributes(startTime, onPlay, controlsElement);

    newTranscriptElement.id = "transcript-" + startTime;
    newTranscriptElement.className = "transcript";
    newTranscriptElement.setAttribute("timestamp", startTime);

    newTranscriptElement.appendChild(controlsElement);
    newTranscriptElement.appendChild(transcriptTitleElement);
    containerElement.appendChild(newTranscriptElement);
  };


  async function fetchTranslations (videoId, config) {
    chrome.storage.sync.get(["videoId"]).then((result) => {
      if (!result["videoId"] || videoId !== JSON.parse(result["videoId"])) {
        chrome.storage.local.get(["Processed_Transcript"]).then(async (result) => {
          console.log("start fetching summary of video");
          let transcripts = JSON.parse(result["Processed_Transcript"]);
          transcripts = transcripts.slice(0,3);
          const gptKey = "Bearer " + config["GPTKey"];
          console.log("start calling gpt api");
          const promises = transcripts.map(async transcript => {
            const startTime = transcript.start;
            const transcriptStr = transcript.text;
            const translationPrompt = transcriptStr + "\n\n" + "Please translate the above text to" + config["Language"] + ".";
            const taskOptions = {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: gptKey,
              },
              body: JSON.stringify({
                model: "text-davinci-003",
                prompt: translationPrompt,
                temperature: 0.9,
                max_tokens: 2048,
                top_p: 0,
                frequency_penalty: 0,
                presence_penalty: 0
              }),
            };
            return fetch("https://api.openai.com/v1/completions", taskOptions).then(response => {
              if (response.ok) {
                return Promise.all([response.json(), startTime]);
              } else {
                return Promise.all([undefined, startTime]);
              }
            }).catch(err => console.log(err));
          });
          const responses = await Promise.all(promises);
          const translations = await Promise.all(responses.map(response  => {
            if (!response[0]) {
              return undefined;
            }
            const translationText = response[0].choices[0].text;
            let currentResult = {"translation":translationText, "startTime": response[1]};
            return currentResult;
          }));
          if (!translations[0]) {
            alert("Cannot generate Translation. Either because gpt api key is incorrect or because chatgpt server currently is busy.");
            chrome.storage.local.set({["APIError"]: 1});
            return;
          }
          translations.sort((a, b) => a["startTime"] - b["startTime"]);
          for (i = 0; i < translations.length; i++) {
            loadTranslation(translations[i]);
          }
          chrome.storage.local.set({["Translation"]: JSON.stringify(translations)});
        });
      } else {
        chrome.storage.local.get(["Translation"]).then((result) => {
          const translations = JSON.parse(result["Translation"]);
          for (i = 0; i < translations.length; i++) {
            loadTranslation(translations[i]);
          }
        });
      }
    });
  };

  const fetchSummary = async(videoId, config) => {
    chrome.storage.sync.get(["videoId"]).then((result) => {
      console.log(JSON.parse(result["videoId"]));
      if (!result["videoId"] || videoId !== JSON.parse(result["videoId"])) {
        chrome.storage.local.get(["Processed_Transcript"]).then((result) => {
          console.log("start fetching summary of video");
          const transcripts = JSON.parse(result["Processed_Transcript"]);
          let transcriptStr = "";
          let tokenLen = 0
          var i;
          for (i = 0; i < transcripts.length; i++) {
            tokenLen = tokenLen + (transcripts[i].text.split(" ")).length;
            transcriptStr = transcriptStr + " " + transcripts[i].text;
            if (tokenLen >= 500) {
              break;
            }
          }

          const gptKey = "Bearer " + config["GPTKey"];
          const summaryPrompt = transcriptStr + "\n\n" + "Your task is to summarize the text I have given you in up to five concise bullet points, starting with a short highlight. Choose an appropriate emoji for each bullet point.\nYour output should use the following template:\n#### Summary\n#### Highlights\n- [Emoji] Bulletpoint\n\n"
          console.log(summaryPrompt);
          const taskOptions = {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: gptKey,
            },
            body: JSON.stringify({
              model: "text-davinci-003",
              prompt: summaryPrompt,
              temperature: config["Mode"],
              max_tokens: 2048,
              top_p: 0,
              frequency_penalty: 0,
              presence_penalty: 0
            }),
          };
          console.log("start calling gpt api");
          fetch("https://api.openai.com/v1/completions", taskOptions)
            .then(response => {
              if (response.ok) {
                chrome.storage.local.set({["APIError"]: 0});
                return response.json()
              } else {
                alert("Please set correct gpt api key in configuration.");
                chrome.storage.local.set({["APIError"]: 1});
                throw new Error('gpt key incorrect.');
              }
            })
            .then(response => {
              const summaryText = response.choices[0].text;
              console.log(summaryText);
              chrome.storage.local.set({["Summary"]: summaryText});
              loadSummary(summaryText);
            })
            .catch(err => console.error(err));
        });
      } else {
        chrome.storage.local.get(["Summary"]).then((result) => {
          console.log("loading stored summary");
          console.log(result["Summary"]);
          loadSummary(result["Summary"]);
        });
      }
    });
  };

  //load elements for summary
  const loadSummary = async (summary) => {

    var containerElement = document.getElementById("summary-container");
    if (!containerElement) {
      //init summary elements in the content page
      console.log('summary container missing');
      return;
    }

    // const testSum = "\n#### Summary\nWalking Tree Technologies is a technology-focused company that specializes in designing and building cross-platform web and mobile applications, performing system integrations, enabling digital transformation, and providing custom solutions to enterprises. Pradeep Lavanya and Akshay Shivastav are the two presenters of the webinar. \n*Highlights*\n- 🤝 Pradeep Lavanya and Akshay Shivastav are the two presenters of the webinar.\n- 💻 Walking Tree Technologies specializes in designing and building cross-platform web and mobile applications.\n- 🔧 They also provide system integrations, digital transformation, and custom solutions to enterprises.\n\n"

    let sumArray = summary.split("####");
    var overviewText, hightlightText;
    if (sumArray.length != 3 || sumArray[1].slice(1,8) !== "Summary" || sumArray[2].slice(1, 11) !== "Highlights") {
      console.log(sumArray[1].slice(0, 7));
      console.log(sumArray[2].slice(0, 10));
      const newSummaryElement = document.createElement("div");
      newSummaryElement.innerText = "Opps, chatgpt fail to generate summary. Try to click the rerun button.";
      newSummaryElement.className = "summary-content";
      containerElement.appendChild(newSummaryElement);
    } else {
      overviewText = sumArray[1].slice(9);
      hightlightText = sumArray[2].slice(12);

      const summaryTitle = document.createElement("div");
      summaryTitle.innerText = "Overview";
      summaryTitle.className = "summary-title";
      containerElement.appendChild(summaryTitle);

      const overviewElement = document.createElement("div");
      overviewElement.innerText = overviewText;
      overviewElement.className = "summary-content";
      containerElement.appendChild(overviewElement);

      const hightlightTitle = document.createElement("div");
      hightlightTitle.innerText = "Highlights";
      hightlightTitle.className = "summary-title";
      containerElement.appendChild(hightlightTitle);

      const hightlightElement = document.createElement("div");
      hightlightElement.innerText = hightlightText;
      hightlightElement.className = "summary-content";
      containerElement.appendChild(hightlightElement);
    }
  };

  //clear previous translations and summary on the content page if any
  const reset = () => {
    chrome.storage.local.set({["APIError"]: 0});
    chrome.storage.sync.set({["videoId"]: JSON.stringify("")});
    chrome.storage.sync.set({["Original_Transcript"]: JSON.stringify([])});
    chrome.storage.sync.set({["Processed_Transcript"]: JSON.stringify([])});
    var containerElement = document.getElementById("translations-container");
    if (containerElement) {
      while (containerElement.firstChild) {
        containerElement.removeChild(containerElement.firstChild);
      }
    }
    containerElement = document.getElementById("summary-container");
    if (containerElement) {
      while (containerElement.firstChild) {
        containerElement.removeChild(containerElement.firstChild);
      }
    }
    containerElement = document.getElementById("transcript-container");
    if (containerElement) {
      while (containerElement.firstChild) {
        containerElement.removeChild(containerElement.firstChild);
      }
    }
  };

  async function loadConfiguration() {
    return new Promise(async (resolve, reject) => {
      var configuration = {};
      var error = 0;
      await chrome.storage.sync.get(["RapidKey"]).then(async (result) => {
        if (!result["RapidKey"] || JSON.parse(result["RapidKey"]).length === 0) {
          error = 1
          return;
        }
        configuration["RapidKey"] = JSON.parse(result["RapidKey"]);
        await chrome.storage.sync.get(["GPTKey"]).then(async (result) => {
          if (!result["GPTKey"] || JSON.parse(result["GPTKey"]).length === 0) {
            error = 2
            return;
          }
          configuration["GPTKey"] = JSON.parse(result["GPTKey"]);
          await chrome.storage.sync.get(["Language"]).then(async (result) => {
            if (!result["Language"] || JSON.parse(result["Language"]).length === 0) {
              error = 3
              return;
            }
            configuration["Language"] = JSON.parse(result["Language"]);
            await chrome.storage.sync.get(["Mode"]).then((result) => {
              if (!result["Mode"]) {
                error = 4
                return;
              }
              configuration["Mode"] = result["Mode"];
            });
          });
        });
      });
      if (error !== 0) {
        return reject(error);
      }
      return resolve(configuration);
    });
  }

  chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    loadExtension();
    loadConfiguration().then((configuration) => {
      if (request.type === "LOAD") {
        chrome.storage.sync.get(["APIError"]).then((result) => {
          if (!result["APIError"] || result["APIError"] === 0) {
            fetchTranscript(request.videoId, configuration);
            fetchSummary(request.videoId, configuration);
            fetchTranslations(request.videoId, configuration);
          }
        });
      } else if (request.type === "NEW" || request.type === "RELOAD") {
        reset();
        fetchTranscript(request.videoId, configuration);
        fetchSummary(request.videoId, configuration);
        fetchTranslations(request.videoId, configuration);
      } 
    })
    .catch((error)=> {
      if (error === 1) {
        alert("Rapid API key is incorrect.");
      }
      if (error === 2) {
        alert("ChatGPT API key is incorrect.");
      }
      if (error === 3) {
        alert("Please select a translation language.");
      }
      if (error === 1) {
        alert("Please select mode for ChatGPT.");
      }
    });
  });
})();

const onPlay = async e => {
  const startTime = e.target.parentNode.parentNode.getAttribute("timestamp");
  youtubePlayer = document.getElementsByClassName('video-stream')[0];
  youtubePlayer.currentTime = startTime;
};

const openTranscriptTab = () => {
  console.log("transcripts tab clicked");
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById("transcript-container").style.display = "block";
  document.getElementById("transcript-btn").className += " active";
};

//open the translations tab
const openTranslationsTab = () => {
  console.log("translations tab clicked");
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById("translations-container").style.display = "block";
  document.getElementById("translations-btn").className += " active";
};

//open the summary tab
const openSummaryTab = () => {
  console.log("summary tab clicked");
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById("summary-container").style.display = "block";
  document.getElementById("summary-btn").className += " active";
};

const setTranslationAttributes =  (start, eventListener, controlParentElement) => {
  const controlElement = document.createElement("button");
  controlElement.className = 'timestampbutton';
  controlElement.textContent = getTime(start);
  controlElement.addEventListener("click", eventListener);
  controlParentElement.appendChild(controlElement);
};

const getTime = t => {
  var date = new Date(0);
  date.setSeconds(t);

  return date.toISOString().substring(11, 19);
};
