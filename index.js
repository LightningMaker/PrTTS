/* npm Modules */
const express = require("express");
const app = express();
const request = require('request');
const http = require('http');
const path = require("path");
const bodyParser = require("body-parser");
const fs = require('fs');
const httpServer = http.Server(app);
const axios = require('axios');
module.exports = run
	
function run(){
	var port = 3239;
	var hostname = "localhost"

	/* Start the server */
	httpServer.listen(port);

	/* Middlewares */
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ limit: '50mb',extended: true }));
	app.use(express.static(path.join(__dirname, "../css")));

	app.get("/", (req,res,next) =>{
		res.status(200).send("本地服务器已启动");
	});
	
	app.get("/exportDOM", (req,res,next) =>{
		var csInterface = new CSInterface();
		const exportDOMAction = (res, result) => {
			res.status(200).send(result);
		};
		
		const embeddedCall = (fn, ...fixedArgs) => {
			return function (...remainingArgs) {
				return fn.apply(this, fixedArgs.concat(remainingArgs));
			};
		};

		const callbackDOM = embeddedCall(exportDOMAction, res);
		csInterface.evalScript("exportDOM()", callbackDOM);
	});

	app.post("/downloadAudio", async (req, res, next) => {
		try {
			console.log("Received request for /downloadAudio");

			var csInterface = new CSInterface();

			// 改为从服务器获取项目路径
			const folderPath = await new Promise((resolve, reject) => {
				csInterface.evalScript('$._ext.getProjectPath()', function(result) {
					if (result) {
						console.log("projPath:" + result);
						let projPath = result;
						// 提取文件夹路径
						const folderPath = projPath.substring(0, projPath.lastIndexOf("\\"));
						console.log("folderPath: " + folderPath);
						resolve(folderPath);
					} else {
						reject("Failed to get project path");
					}
				});
			});
	
			// 从 POST 表单中获取参数
			const text = req.body.text;
			const trackSelect = req.body.trackSelect;
			const voiceSelect = req.body.voiceSelect;
			const platformSelect = req.body.platformSelect;

			//如果text为空
			if(!text){
				res.status(200).send("未输入文本");
				return;
			}
	
			console.log("Parameters:", { text, folderPath, trackSelect, voiceSelect, platformSelect });
	
			if(platformSelect == "ttsmaker"){
				const params = {
					token: 'ttsmaker_demo_token',
					text: text,
					voice_id: voiceSelect,
					audio_format: 'mp3',
					audio_speed: 1.0,
					audio_volume: 0,
					text_paragraph_pause_time: 0
				};
		
				console.log("Sending request to TTS API");
				const response = await axios.post('https://api.ttsmaker.cn/v1/create-tts-order', params);
				console.log("Received response from TTS API:", response.data);
		
				const audio_file_url = response.data.audio_file_url;
				console.log('audio_file_url:', audio_file_url);

				if(!audio_file_url){
					error_code = response.data.error_code;
					if(error_code == "TOTAL_TOKEN_CHARACTERS_EXCEED_LIMIT"){
						res.status(200).send("TTSMaker 本周 Token 已用完，请选择其他平台");
					}else{
						res.status(200).send("音频下载遇到错误: " + response.data.error_code);
					}
					return;
				}
		
				const childFolderPath = path.resolve(folderPath, 'TTS Audio');
				if (!fs.existsSync(childFolderPath)) {
					console.log("Creating directory:", childFolderPath);
					fs.mkdirSync(childFolderPath);
				}
		
				let fileName = text.replace(/[^\w\s\u4e00-\u9fa5]/gi, '').trim();
				fileName = fileName.substring(0, 30);
				//移除换行
				fileName = fileName.replace(/[\r\n]/g, '');
				fileName += new Date().getTime();
				fileName += '.mp3';
		
				const outputLocationPath = path.resolve(childFolderPath, fileName);
				console.log('outputLocationPath:', outputLocationPath);
		
				console.log("Starting download of MP3");
				await downloadMp3(audio_file_url, outputLocationPath);
				console.log("Download completed");
				

				const filePath = outputLocationPath.replace(/\\/g, "/");
						console.log("downloadAudio filePath: " + filePath);
						csInterface.evalScript(`$._ext.importSingleFile("${filePath}", ${trackSelect})`, function(result) {
							console.log(result);
							res.status(200).send(result);
						});


			}else if(platformSelect == "azure"){

				const childFolderPath = path.resolve(folderPath, 'TTS Audio');
				if (!fs.existsSync(childFolderPath)) {
					console.log("Creating directory:", childFolderPath);
					fs.mkdirSync(childFolderPath);
				}
		
				let fileName = text.replace(/[^\w\s\u4e00-\u9fa5]/gi, '').trim();
				fileName = fileName.substring(0, 30);
				//移除换行
				fileName = fileName.replace(/[\r\n]/g, '');
				fileName += new Date().getTime();
				fileName += '.mp3';
		
				const outputLocationPath = path.resolve(childFolderPath, fileName);
				console.log('outputLocationPath:', outputLocationPath);



				//使用Azure js sdk
				var sdk = require("microsoft-cognitiveservices-speech-sdk");

				var audioFile = outputLocationPath;

				const speechConfig = sdk.SpeechConfig.fromSubscription("", "eastasia");
				const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioFile);

				// The language of the voice that speaks.
				speechConfig.speechSynthesisVoiceName = voiceSelect; 

				const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

				//合成语音并下载到指定目录
				synthesizer.speakTextAsync(
					text,
					function (result) {
						if (result) {
							console.log(JSON.stringify(result));
							console.log("Speech synthesized to speaker for text [" + text + "]");

							const filePath = outputLocationPath.replace(/\\/g, "/");
							console.log("downloadAudio filePath: " + filePath);
							csInterface.evalScript(`$._ext.importSingleFile("${filePath}", ${trackSelect})`, function(result) {
								console.log(result);
								res.status(200).send(result);
							});

						} else {
							console.log("Unexpected synthesis result: " + result);
							res.status(200).send("音频下载遇到错误: " + result);

						}
					},
					function (err) {
						console.trace("err - " + err);
						res.status(200).send("音频下载遇到错误: " + err);
					}
				);

			}

		
		} catch (error) {
			console.log("Error occurred:", error);
			res.status(200).send("音频下载遇到错误: " + error);
		}
	});
}

async function downloadMp3(url, outputLocationPath) {
    return new Promise((resolve, reject) => {
        const req = request(url, { timeout: 10000, pool: false });
        req.setMaxListeners(50);
        req.setHeader('user-agent', 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36');

        req.on('error', (err) => {
            reject(err);
        });

        req.on('response', (res) => {
            res.setEncoding("binary");
            let fileData = "";

            res.on('data', (chunk) => {
                fileData += chunk;
            });

            res.on('end', () => {
                fs.writeFile(outputLocationPath, fileData, "binary", (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log("文件下载成功");
                        resolve();
                    }
                });
            });
        });
    });
}

