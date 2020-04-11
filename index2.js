const request = require('request');
require('custom-env').env('dev');
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
require("tls").DEFAULT_MIN_VERSION = "TLSv1";


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
    'url': process.env.XSJS_BASE_URL + '/app_xsjs/ExecQuery.xsjs?dbName='+ process.env.REV_COMPANY +'&procName=spAppIntercompany&queryTag=getlogs&value1=0&value2&value3&value4',
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
            console.log("Error on getForSync");
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
            if (err) console.log("Error on getDocumentPO"); //reject("Error on getDocumentPO");
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

let postBFI = async () => {
    return new Promise((resolve, reject) => {
        //resolve("asdf");
        request(postOptionBFI, (errpost, resppost) => {
            if (errpost) reject("error1"); //return setTimeout(() => reject("Error : Request to POST in Engine Script BFI Purchase Order"), 500);
            if (JSON.parse(resppost.body).error) {
                reject(JSON.parse(resppost.body).error); //return setTimeout(() => reject(`SAP Error on Posting BFI PO from REV PO DocEntry ${docEntry}: \t${JSON.parse(resppost.body).error.message.value}  `), 500);
                //throw new Error(JSON.parse(resppost.body).error.message.value);
            } else {
                resolve(resppost); //return setTimeout(() => resolve(JSON.parse(resppost.body).BFIPurchaseOrder.body.DocNum), 500);
            }
        });
    });
}

let postREV = async function () {
    return new Promise((resolve, reject) => { 

        request(postOptionREV, (errpost, resppost) => {
            if (errpost) reject("Error : Request to POST in REV Sales Order");
            if (JSON.parse(resppost.body).error){ 
                reject(JSON.parse(resppost.body).error.message.value);
            }
            
            resolve("Done");
            // if (JSON.parse(resppost.body).error) {
            //     reject(JSON.parse(resppost.body).error);
            //     //reject(`SAP Error on Posting REV SO from REV PO DocEntry ${docEntry}: \t${JSON.parse(resppost.body).error.message.value}  `)
            //     //throw new Error(JSON.parse(resppost.body).error.message.value);
            // } else {
            //     resolve(JSON.parse(resppost.body).SalesOrderDetail.body.DocNum);
            // }
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

                let U_DocEntry = e.U_PODocEntry;
                let poDetail = await getDocumentPO(U_DocEntry);
                // console.log(poDetail);
                console.log("after getDocumentPO");

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
                    bodyPurchaseOrder.Comments = `Based on REV Purchase Order DocEntry : ${JSON.parse(poDetail)[0].DocEntry} | DocNum : ${JSON.parse(poDetail)[0].DocNum}`;
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
                    console.log(postOptionREV.body);

                }

                await startRowLoop();

                console.log("after startRowLoop");

                await postBFI()
                .then((res) => {
                    console.log(`BFI Purchase Order Draft Number : ${JSON.parse(res.body).DocEntry}`); 
                }).catch((err) => {
                    console.log(err);
                });

                await postREV()
                .then((res) => {
                    console.log(`REV Sales Order Number : ${JSON.parse(res.body).DocEntry}`);
                }).catch((err) => {
                    console.log(err);
                });
                
                console.log(`Done processing ${e.U_PODocEntry}`);
                

                // // console.log(JSON.parse(poDetail)[0].DocNum);
                // console.log("-------");

            })

        }).catch((err) => {
            console.log(err);
        });
        
    

}

start();