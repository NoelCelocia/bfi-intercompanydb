const request = require('request');
require('custom-env').env('dev2');
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
require("tls").DEFAULT_MIN_VERSION = "TLSv1";
const chalk = require('chalk');

const base64XSJSCredential = Buffer.from(process.env.XSJS_USERNAME + ":" + process.env.XSJS_PASSWORD).toString('base64');
let bfiCookie = [];
let revCookie = [];
let aSyncList = [];

let loginOptionBFI = {
    'method': 'POST',
    'url': process.env.SL_BASE_URL + '/Login',
    'headers': {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        "CompanyDB": process.env.BFI_COMPANY,
        "Password": process.env.SL_PASSWORD_BFI,
        "UserName": process.env.SL_USERNAME_BFI
    })

};

let loginOptionREV = {
    'method': 'POST',
    'url': process.env.SL_BASE_URL + '/Login',
    'headers': {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        "CompanyDB": process.env.REV_COMPANY,
        "Password": process.env.SL_PASSWORD_REV,
        "UserName": process.env.SL_USERNAME_REV
    })
};

let getForSyncOption = {
    'method': 'GET',
    'url': process.env.XSJS_BASE_URL + '/app_xsjs/ExecQuery.xsjs?dbName=' + process.env.REV_COMPANY + '&procName=spAppIntercompany&queryTag=getlogs&value1=0&value2&value3&value4',
    'headers': {
        'Authorization': 'Basic ' + base64XSJSCredential
    }
};

let getPriceOption = {
    'method': 'GET',
    'url': process.env.XSJS_BASE_URL + '/app_xsjs/ExecQuery.xsjs?dbName=' + process.env.REV_COMPANY + '&procName=spAppIntercompany&queryTag=getPricePerItemVendor&value1=XXX&value2=YYY&value3&value4',
    'headers': {
        'Authorization': `Basic ${base64XSJSCredential}`
    }
}


let getPODetails = {
    'method': 'GET',
    'url': process.env.XSJS_BASE_URL + '/app_xsjs/ExecQuery.xsjs?dbName=REVIVE_APPTECH_INTERNAL&procName=spAppIntercompany&queryTag=getallpoforbfi&value1=&value2&value3&value4',
    'headers': {
        'Authorization': 'Basic ' + base64XSJSCredential
    }
};

let postOptionBFIDraft = {
    'method': 'POST',
    'url': process.env.SL_BASE_URL + '/Drafts',
    'headers': {
        'Content-Type': 'application/json',
        'Cookie': ''
    },
    'body': ""
}

//'/script/apptech/BFIpurchaseorder',
let postOptionBFI = {
    'method': 'POST',
    'url': process.env.SL_BASE_URL + '/Drafts',
    'headers': {
        'Content-Type': 'application/json',
        'Cookie': ''
    },
    'body': ""
}

let postOptionREV = {
    'method': 'POST',
    'url': process.env.SL_BASE_URL + '/Orders',
    'headers': {
        'Content-Type': 'application/json',
        'Cookie': ''
    },
    'body': ""
}

let postOptionREVBlanket = {
    "method": "POST",
    "url": process.env.SL_BASE_URL + "/BlanketAgreements",
    "headers": {
        "Content-Type": "application/json",
        "Cookie": ""
    },
    "body": ""
}

const loginBFI = new Promise((resolve, reject) => {
    request(loginOptionBFI, (logerror, logresponse) => {
        if (logerror) reject(logerror);
        resolve(logresponse.headers["set-cookie"]);
    });
});

const loginREV = new Promise((resolve, reject) => {
    request(loginOptionREV, (logerror, logresponse) => {
        if (logerror) reject(logerror);
        resolve(logresponse.headers["set-cookie"]);
    });
});

const getForSync = new Promise((resolve, reject) => {
    request(getForSyncOption, (error, response) => {
        if (error) {
            reject("Reject on getForSync");
        }
        resolve(JSON.parse(response.body));
    });
});

let getDocumentPO = async function (docEntry) {
    return new Promise((resolve, reject) => {

        let getPO = JSON.parse(JSON.stringify(getPODetails));

        getPO.url = process.env.XSJS_BASE_URL + '/app_xsjs/ExecQuery.xsjs?dbName=' + process.env.REV_COMPANY + '&procName=spAppIntercompany&queryTag=getallpoforbfi&value1=' + docEntry + '&value2&value3&value4';

        request(getPO, (err, resp) => {
            if (err) reject(err); //reject("Error on getDocumentPO");
            resolve(resp.body);
        });
    });
}

let getPrice = async function () {
    return new Promise((resolve, reject) => {
        request(getPriceOption, (err, resp) => {
            if (err) reject(err);
            resolve(resp.body);
        })
    })
}

let postBFIDraft = async function () {
    return new Promise((resolve, reject) => {
        request(postOptionBFIDraft, (errpost, resppost) => {
            if (errpost) reject("Error : Request to POST Draft Sales Order");
            resolve(resppost);

        });
    });
}

let removeDraft = async function (removeDraftOption) {
    return new Promise((resolve, reject) => {
        request(removeDraftOption, (err, res) => {
            if (err) resolve({
                "errorCode": "-1001",
                "err": JSON.stringify(err) 
            });
            resolve(res);
        })
    });
}

let addDraft = async function (addDraftOption) {
    return new Promise((resolve, reject) => {
        request(addDraftOption, (err, res) => {
            if (err) resolve({
                "errorCode": "-1002",
                "err": JSON.stringify(err)
            });

            if (res.body.error) {
                resolve({
                    "errorCode": "-1003",
                    "err": JSON.stringify(res.body)
                });
            }
            resolve(res);
        });

    });
}

let postBFI = async () => {
    return new Promise((resolve, reject) => {
        request(postOptionBFI, (errpost, resppost) => {
            if (errpost) resolve({
                error: "-1005",
                errorDesc: JSON.stringify(errpost)
            });
            if (JSON.parse(resppost.body).error) {
                console.log(JSON.stringify(JSON.parse(resppost.body)));
                resolve({
                    error: "-1006",
                    errorDesc: JSON.stringify(JSON.parse(resppost.body).error)
                });
            } else {
                resolve(resppost);
            }
        });
    });
}

let postREV = async () => {
    return new Promise((resolve, reject) => {

        request(postOptionREV, (errpost, resppost) => {
            if (errpost) resolve({
                error: "-1003",
                errorDesc: errpost
            });
            if (JSON.parse(resppost.body).error) {
                resolve({
                    error: "-1004",
                    errorDesc: JSON.parse(resppost.body).error
                });
            }
            resolve(resppost);
        });
    });
}

let postREVBlanket = async () => {
    return new Promise((resolve, reject) => {

        request(postOptionREVBlanket, (errpost, resppost) => {
            if (errpost) resolve({
                error: "-1005",
                errorDesc: errpost
            });
            if (JSON.parse(resppost.body).error) {
                resolve({
                    error: "-1006",
                    errorDesc: JSON.parse(resppost.body).error
                });
            }
            resolve(resppost);
        });
    });
}

let postStatREV = async (poDocEntry, errCode, errDesc) => {
    return new Promise((resolve, reject) => {

        let updateStat = JSON.parse(JSON.stringify(getPODetails));

        if (errCode === "1") { //error
            updateStat.url = process.env.XSJS_BASE_URL + '/app_xsjs/ExecQuery.xsjs?dbName=' + process.env.REV_COMPANY + '&procName=spAppIntercompany&queryTag=updateStat&value1=' + poDocEntry + '&value2=' + errCode + '&value3=' + errDesc + '&value4';
        } else {
            updateStat.url = process.env.XSJS_BASE_URL + '/app_xsjs/ExecQuery.xsjs?dbName=' + process.env.REV_COMPANY + '&procName=spAppIntercompany&queryTag=updateStat&value1=' + poDocEntry + '&value2=' + errCode + '&value3&value4';
        }
        // updateStat.url = encodeURIComponent(updateStat.url);
        request(updateStat, (err, resp) => {
            if (err) resolve({
                error: "-1"
            }); //reject("Error on getDocumentPO");
            resolve(resp.body);
        });
    });
}

const asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}

async function start() {

    Promise.all([
        loginBFI,
        loginREV,
        getForSync
    ]).then((res) => {
        bfiCookie = res[0];
        revCookie = res[1];
        aSyncList = res[2];
        console.log("--------------------------------------");
        console.log(`Number of records to be sync: ${aSyncList.length}`);
        asyncForEach(aSyncList, async (e) => {

            let sPostedDraftDocEntry = "";

            let U_DocEntry = e.U_PODocEntry;
            // let U_PODocNum = e.U_PODocNum;
            // console.log(`Processing DocEntry: ${U_DocEntry} | DocNum : ${U_PODocEntry}`);
            let poDetail = await getDocumentPO(U_DocEntry);

            var bodySalesOrder = {},
                bodyPurchaseOrder = {},
                bodyBlanketAgreement = {};
            bodySalesOrder.DocumentLines = [],
                bodyPurchaseOrder.DocumentLines = [],
                bodyBlanketAgreement.BlanketAgreements_ItemsLines = [];

            const startRowLoop = async () => {

                await asyncForEach(JSON.parse(poDetail), async (ee) => {
                    var oItem = {},
                        oItemBA = {};
                    oItem.ItemCode = ee.ItemCode;
                    oItem.Quantity = ee.Quantity;
                    oItem.WarehouseCode = ee.WhsCode;
                    oItem.VatGroup = "IVAT-E";
                    oItem.U_APP_BlankAgr = ee.U_APP_BlankAgr;
                    

                    getPriceOption.url = getPriceOption.url.replace("XXX", ee.ItemCode).replace("YYY", process.env.PO_CARDCODE);
                    let iPrice = await getPrice();
                    iPrice = JSON.parse(iPrice.replace("[", "").replace("]", "")).Price;
                    oItem.UnitPrice = iPrice; //ee.Price;

                    oItem.OcrCode = ee.U_APP_Division;  //"01";
                    oItem.OcrCode2 = ee.U_APP_Group;
                    oItem.OcrCode3 = ee.U_APP_Department;
                    oItem.OcrCode4 = ee.U_APP_Section;
                    oItem.CostingCode = ee.U_APP_Division;
                    oItem.COGSCostingCode = ee.U_APP_Division;
                    oItem.CostingCode2 = ee.U_APP_Group;
                    oItem.CostingCode3= ee.U_APP_Department;
                    oItem.CostingCode4 = ee.U_APP_Section;

                    //------
                    oItemBA.ItemNo = ee.ItemCode;
                    oItemBA.PlannedQuantity = ee.Quantity;
                    oItemBA.UnitPrice = ee.Price;
                    //------
                    bodySalesOrder.DocumentLines.push(JSON.parse(JSON.stringify(oItem)));
                    bodyPurchaseOrder.DocumentLines.push(JSON.parse(JSON.stringify(oItem)));
                    bodyBlanketAgreement.BlanketAgreements_ItemsLines.push(JSON.parse(JSON.stringify(oItemBA)));
                    getPriceOption.url = process.env.XSJS_BASE_URL + '/app_xsjs/ExecQuery.xsjs?dbName=' + process.env.REV_COMPANY + '&procName=spAppIntercompany&queryTag=getPricePerItemVendor&value1=XXX&value2=YYY&value3&value4';
                })
                //----PURCHASE ORDER DRAFT
                bodyPurchaseOrder.DocDueDate = JSON.parse(poDetail)[0].DocDueDate;
                bodyPurchaseOrder.U_APP_Farmer = JSON.parse(poDetail)[0].CardCode;
                bodyPurchaseOrder.CardCode = process.env.PO_CARDCODE;
                bodyPurchaseOrder.Comments = `Based on REV Purchase Order DocEntry : ${JSON.parse(poDetail)[0].DocEntry} | DocNum : ${JSON.parse(poDetail)[0].DocNum}`;
                bodyPurchaseOrder.NumAtCard = JSON.parse(poDetail)[0].NumAtCard;
                bodyPurchaseOrder.U_APP_IsDBTran = "1";
                bodyPurchaseOrder.U_APP_PORef = U_DocEntry
                bodyPurchaseOrder.DocObjectCode = "22";
                bodyPurchaseOrder.U_FSQRTransID = JSON.parse(poDetail)[0].U_FSQRTransID;
                postOptionBFI.headers.Cookie = bfiCookie;
                postOptionBFI.body = JSON.stringify(bodyPurchaseOrder);

                //----SALES ORDER
                bodySalesOrder.DocDueDate = JSON.parse(poDetail)[0].DocDueDate;
                bodySalesOrder.CardCode = process.env.SO_CARDCODE;
                bodySalesOrder.Comments = `Based on REV Purchase Order DocEntry : ${JSON.parse(poDetail)[0].DocEntry} | DocNum : ${JSON.parse(poDetail)[0].DocNum}`;
                bodySalesOrder.NumAtCard = JSON.parse(poDetail)[0].NumAtCard;
                bodySalesOrder.U_APP_IsDBTran = "1";
                postOptionREV.headers.Cookie = revCookie;
                postOptionREV.body = JSON.stringify(bodySalesOrder);

                //-----BLANKET AGREEMENT REVIVE
                bodyBlanketAgreement.Status = "asDraft";
                bodyBlanketAgreement.BPCode = process.env.SO_CARDCODE;
                bodyBlanketAgreement.StartDate = JSON.parse(poDetail)[0].DocDueDate;
                bodyBlanketAgreement.EndDate = JSON.parse(poDetail)[0].DocDueDate;
                bodyBlanketAgreement.SigningDate = JSON.parse(poDetail)[0].DocDueDate;
                bodyBlanketAgreement.AgreementType = "atGeneral";
                bodyBlanketAgreement.Description = `FSQR Trans ID : ${JSON.parse(poDetail)[0].U_FSQRTransID}`;
                bodyBlanketAgreement.Remarks = `Based on REV Purchase Order DocEntry : ${JSON.parse(poDetail)[0].DocEntry} | DocNum : ${JSON.parse(poDetail)[0].DocNum}`;
                postOptionREVBlanket.headers.Cookie = revCookie;
                postOptionREVBlanket.body = JSON.stringify(bodyBlanketAgreement);

            }

            await startRowLoop();
            let postBFIres = await postBFI();
            if (postBFIres.error) {
                console.log(JSON.stringify(postBFIres.error));

                //tag as error
                let stat = await postStatREV(U_DocEntry, "1", postBFIres.errorDesc);
                console.log("Error on posting BFI Draft Purchase Order");
                return;
            }
            sPostedDraftDocEntry = JSON.parse(postBFIres.body).DocEntry;
            var sFSQRID = JSON.parse(postBFIres.body).U_FSQRTransID;

            let addDraftOption = {};
            addDraftOption.method = "POST";
            addDraftOption.url = `${process.env.SL_BASE_URL}/DraftsService_SaveDraftToDocument`;
            addDraftOption.headers = {
                "Cookie": bfiCookie
            }
            addDraftOption.body = JSON.stringify({
                "Document": {
                    "DocEntry": sPostedDraftDocEntry
                }
            });
            let addActualDraftBFIres = await addDraft(JSON.parse(JSON.stringify(addDraftOption)));

            let stat = await postStatREV(U_DocEntry, "2", "Success");

            console.log(`Done processing Revive PO : ${e.U_PODocEntry} - FSQR Transction ID: ${sFSQRID}`);



        })

    }).catch((err) => {
        console.log(err);
    });



}

start();