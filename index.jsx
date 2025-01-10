/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2014 Adobe
* All Rights Reserved.
*
* NOTICE: Adobe permits you to use, modify, and distribute this file in
* accordance with the terms of the Adobe license agreement accompanying
* it. If you have received this file from a source other than Adobe,
* then your use, modification, or distribution of it requires the prior
* written permission of Adobe. 
**************************************************************************/
if(typeof($)=='undefined'){
	$={};
}

function exportDOM(){
	var retVal = {};
	for(m in app){
		if(app.hasOwnProperty(m)) {
			retVal[m.toStgring()] = app[m];
		}
	}

	return JSON.stringify(retVal);
}

$._ext = {
	getProjectPath: function() {
		return app.project.path;
		$.write("Getting project path...");
		if (app.project.path) {
		  $.write("Project path found.");
		  return app.project.path;
		}
		$.write("No project path.");
		return "No project path";
	},
	importSingleFile: function(filePath, trackSelect) {
        try {
                var importedItem = null;
                var targetBinName = "TTS Audio";
                var targetBin = findOrCreateBin(app.project.rootItem, targetBinName);

				// 导入文件
				app.project.importFiles([filePath], true, targetBin);

				// 获取文件名
				var fileName = filePath.split("/").pop();

                // 查找导入的文件
				var log = "fileName: " + fileName + "\n";

                for (var i = 0; i < targetBin.children.numItems; i++) {
                    var item = targetBin.children[i];
					log += item.name + "  ";
					log += item.type + "\n";

                    if (item.type === ProjectItemType.CLIP && item.name === fileName) {
                        importedItem = item;
                        break;
                    }
                }

				//return log;

                if (importedItem) {
                    // 查找或创建目标子目录
                    /*for (var j = 0; j < app.project.rootItem.children.numItems; j++) {
                        var bin = app.project.rootItem.children[j];
                        if (bin.name === targetBinName && bin.type === ProjectItemType.BIN) {
                            targetBin = bin;
                            break;
                        }
                    }

                    if (!targetBin) {
                        targetBin = app.project.rootItem.createBin(targetBinName);
                    }**/

                    

					//如果有序列，将音频文件添加到序列
					var sequence = app.project.activeSequence;
					if(sequence){
						//获取当前时间
						var time = sequence.getPlayerPosition();
						var sec = time.seconds;
						var tick = time.ticks;

						//var audioTrack = sequence.audioTracks[2];
						//audioTrack.insertClip(importedItem, sec);
						//等待0.5秒
						$.sleep(500);

						sequence.insertClip(importedItem, tick, trackSelect, trackSelect);

						
					}

					// 将导入的文件移动到目标子目录
                    //importedItem.moveBin(targetBin);




                    return "音频导入成功";
                } else {
                    return "音频导入失败，未找到音频文件";
                }
            
        } catch (e) {
            return "音频导入遇到错误： " + e.toString();
        }
    }
};

function findOrCreateBin(rootItem, binName) {
    for (var i = 0; i < rootItem.children.numItems; i++) {
        var item = rootItem.children[i];
        if (item.name === binName && item.type === ProjectItemType.BIN) {
            return item;
        }
    }
    return rootItem.createBin(binName);
}

