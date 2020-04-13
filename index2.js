const request = require('request');
require('custom-env').env('dev');
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

let deleteOptionDraftBFI = {

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

        getPO.url = process.env.XSJS_BASE_URL + '/app_xsjs/ExecQuery.xsjs?dbName=REVIVE_APPTECH_INTERNAL&procName=spAppIntercompany&queryTag=getallpoforbfi&value1=' + docEntry + '&value2&value3&value4';

        request(getPO, (err, resp) => {
            if (err) reject(err); //reject("Error on getDocumentPO");
            resolve(resp.body);
        });
    });
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
            if (errpost) reject({
                error: "-1005",
                errorDesc: JSON.stringify(errpost)
            }); //return setTimeout(() => reject("Error : Request to POST in Engine Script BFI Purchase Order"), 500);
            if (JSON.parse(resppost.body).error) {
                reject(JSON.parse(resppost.body).error); //return setTimeout(() => reject(`SAP Error on Posting BFI PO from REV PO DocEntry ${docEntry}: \t${JSON.parse(resppost.body).error.message.value}  `), 500);
                //throw new Error(JSON.parse(resppost.body).error.message.value);
            } else {
                resolve(resppost); //return setTimeout(() => resolve(JSON.parse(resppost.body).BFIPurchaseOrder.body.DocNum), 500);
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

        asyncForEach(aSyncList, async (e) => {

            let sPostedDraftDocEntry = "";

            let U_DocEntry = e.U_PODocEntry;
            let poDetail = await getDocumentPO(U_DocEntry);
            // console.log(poDetail);

            var bodySalesOrder = {},
                bodyPurchaseOrder = {};
            bodySalesOrder.DocumentLines = [],
                bodyPurchaseOrder.DocumentLines = [];

            const startRowLoop = async () => {
                console.log("startRowLoop");

                await asyncForEach(JSON.parse(poDetail), async (ee) => {
                    var oItem = {};
                    oItem.ItemCode = ee.ItemCode;
                    oItem.Quantity = ee.Quantity;
                    oItem.UnitPrice = ee.Price;
                    oItem.WarehouseCode = ee.WhsCode;
                    bodySalesOrder.DocumentLines.push(JSON.parse(JSON.stringify(oItem)));
                    bodyPurchaseOrder.DocumentLines.push(JSON.parse(JSON.stringify(oItem)));
                })
                //----PURCHASE ORDER DRAFT
                bodyPurchaseOrder.DocDueDate = JSON.parse(poDetail)[0].DocDueDate;
                bodyPurchaseOrder.CardCode = process.env.PO_CARDCODE;
                bodyPurchaseOrder.Comments = `CPA TEST`; //`Based on REV Purchase Order DocEntry : ${JSON.parse(poDetail)[0].DocEntry} | DocNum : ${JSON.parse(poDetail)[0].DocNum}`;
                bodyPurchaseOrder.NumAtCard = JSON.parse(poDetail)[0].NumAtCard;
                bodyPurchaseOrder.U_APP_IsDBTran = "1";
                bodyPurchaseOrder.DocObjectCode = "22";
                postOptionBFI.headers.Cookie = bfiCookie;
                postOptionBFI.body = JSON.stringify(bodyPurchaseOrder);

                //----SALES ORDER
                bodySalesOrder.DocDueDate = JSON.parse(poDetail)[0].DocDueDate;
                bodySalesOrder.CardCode = "C1000061";
                bodySalesOrder.Comments = `Based on REV Purchase Order DocEntry : ${JSON.parse(poDetail)[0].DocEntry} | DocNum : ${JSON.parse(poDetail)[0].DocNum}`;
                bodySalesOrder.NumAtCard = JSON.parse(poDetail)[0].NumAtCard;
                bodySalesOrder.U_APP_IsDBTran = "1";
                postOptionREV.headers.Cookie = revCookie;

                postOptionREV.body = JSON.stringify(bodySalesOrder);

            }

            await startRowLoop();
            let postBFIres = await postBFI();
            sPostedDraftDocEntry = JSON.parse(postBFIres.body).DocEntry;
            let postREVres = await postREV();

            if (postREVres.error) {
                let removeDraftOption = {};
                removeDraftOption.method = "DELETE";
                removeDraftOption.url = `${process.env.SL_BASE_URL}/Drafts(${sPostedDraftDocEntry})`;
                removeDraftOption.headers = {
                    "Cookie": bfiCookie
                };
                console.log(removeDraftOption);
                let deleteDraftBFIres = await removeDraft(JSON.parse(JSON.stringify(removeDraftOption)));
                console.log(deleteDraftBFIres);
            } else {
                let addDraftOption = {};
                addDraftOption.method = "POST";
                addDraftOption.url = `${process.env.SL_BASE_URL}/DraftsService_SaveDraftToDocument`;
                addDraftOption.headers = {
                    "Cookie" : bfiCookie
                }
                addDraftOption.body = JSON.stringify({
                    "Document": {
                        "DocEntry": sPostedDraftDocEntry
                    }
                });
                let addActualDraftBFIres = await addDraft(JSON.parse(JSON.stringify(addDraftOption)));
                console.log(addActualDraftBFIres);

            }

            // await postBFI()
            //     .then((res) => {
            //         sPostedDraftDocEntry = JSON.parse(res.body).DocEntry;
            //         console.log(chalk.green(`BFI Purchase Order Draft Number : ${JSON.parse(res.body).DocEntry}`));

            //         await postREV();


            //     }).then((res) => {
            //         console.log(res);
            //     }).catch((err) => {
            //         console.log(err);
            //     });

            // await postREV()
            // .then((res) => {
            //     console.log(`REV Sales Order Number : ${JSON.parse(res.body).DocEntry}`);
            // }).catch((err) => {
            //     console.log(chalk.red(err));
            // });

            console.log(`Done processing ${e.U_PODocEntry}`);


            // // console.log(JSON.parse(poDetail)[0].DocNum);
            // console.log("-------");

        })

    }).catch((err) => {
        console.log(err);
    });



}

start();