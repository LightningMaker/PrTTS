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
	
			// 从 POST 表单中获取参数
			const text = req.body.text;
			const folderPath = req.body.folderPath;
			const trackSelect = req.body.trackSelect;
			const voiceSelect = req.body.voiceSelect;
	
			console.log("Parameters:", { text, folderPath, trackSelect });
	
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

