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
    'url': process.env.XSJS_BASE_URL + '/app_xsjs/ExecQuery.xsjs?dbName=REVIVE_APPTECH_INTERNAL&procName=spAppIntercompany&queryTag=getlogs&value1=0&value2&value3&value4',
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

let postOptionBFI = {
    'method': 'POST',
    'url': process.env.SL_BASE_URL + '/script/apptech/BFIpurchaseorder',
    'headers': {
        'Content-Type': 'application/json',
        'Cookie': ''
    },
    'body': ""
}

let postOptionREV = {
    'method': 'POST',
    'url': process.env.SL_BASE_URL + '/script/apptech/REVsalesorder',
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
            if (errpost) return setTimeout(() => reject("Error : Request to POST in Engine Script BFI Purchase Order"), 500);
            if (JSON.parse(resppost.body).error) {
                return setTimeout(() => reject(`SAP Error on Posting BFI PO from REV PO DocEntry ${docEntry}: \t${JSON.parse(resppost.body).error.message.value}  `), 500);
                //throw new Error(JSON.parse(resppost.body).error.message.value);
            } else {
                return setTimeout(() => resolve(JSON.parse(resppost.body).BFIPurchaseOrder.body.DocNum), 500);
            }
        });
    });
}

let postREV = async function () {
    return new Promise((resolve, reject) => {
        request(postOptionREV, (errpost, resppost) => {
            if (errpost) reject("Error : Request to POST in Engine Script REV Sales Order");
            if (JSON.parse(resppost.body).error) {
                //reject(JSON.parse(resppost.body).error);
                reject(`SAP Error on Posting REV SO from REV PO DocEntry ${docEntry}: \t${JSON.parse(resppost.body).error.message.value}  `)
                //throw new Error(JSON.parse(resppost.body).error.message.value);
            } else {
                resolve(JSON.parse(resppost.body).SalesOrderDetail.body.DocNum);
            }
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

            // console.log(JSON.parse(poDetail));

            var bodySalesOrder = {},
                bodyPurchaseOrder = {};
            bodySalesOrder.DocumentLines = [],
                bodyPurchaseOrder.DocumentLines = [];

            const startRowLoop = async () => {
                await asyncForEach(JSON.parse(poDetail), async (ee) => {
                    var oItem = {};
                    oItem.ItemCode = ee.ItemCode;
                    oItem.Quantity = ee.Quantity;
                    oItem.UnitPrice = ee.Price;
                    oItem.WarehouseCode = ee.WhsCode;
                    bodySalesOrder.DocumentLines.push(JSON.parse(JSON.stringify(oItem)));
                    bodyPurchaseOrder.DocumentLines.push(JSON.parse(JSON.stringify(oItem)));
                })
                bodySalesOrder.NumAtCard = JSON.parse(poDetail)[0].NumAtCard;
                bodyPurchaseOrder.NumAtCard = JSON.parse(poDetail)[0].NumAtCard;

                bodtSalesOrder.DocObjectCode = "22";
                bodySalesOrder.Comments = `Based on REV Purchase Order DocEntry : ${JSON.parse(poDetail)[0].DocEntry} | DocNum : ${JSON.parse(poDetail)[0].DocNum}`;
                bodyPurchaseOrder.Comments = `Based on REV Purchase Order DocEntry : ${JSON.parse(poDetail)[0].DocEntry} | DocNum : ${JSON.parse(poDetail)[0].DocNum}`;
                console.log(bodySalesOrder);




            }

            startRowLoop();
            


            // console.log(JSON.parse(poDetail)[0].DocNum);
            console.log("-------");
            return;




            asyncForEach(poDetail, async (ee) => {
                var oItem = {};
                oItem.ItemCode = ee.ItemCode;
                oItem.Quantity = ee.Quantity;
                oItem.UnitPrice = ee.Price;
                oItem.WarehouseCode = ee.WhsCode;
                bodySalesOrder.DocumentLines.push(JSON.parse(JSON.stringify(oItem)));
                bodyPurchaseOrder.DocumentLines.push(JSON.parse(JSON.stringify(oItem)));
            })

            bodySalesOrder.NumAtCard = JSON.parse(poDetail)[0].NumAtCard;
            bodyPurchaseOrder.NumAtCard = JSON.parse(poDetail)[0].NumAtCard;

            bodySalesOrder.U_APP_IsDBTran = "1";
            bodyPurchaseOrder.U_APP_IsDBTran = "1";

            bodySalesOrder.Comments = `Based on REV Purchase Order DocEntry : ${JSON.parse(poDetail)[0].DocEntry} | DocNum : ${JSON.parse(poDetail)[0].DocNum}`;
            bodyPurchaseOrder.Comments = `Based on REV Purchase Order DocEntry : ${JSON.parse(poDetail)[0].DocEntry} | DocNum : ${JSON.parse(poDetail)[0].DocNum}`;

            bodySalesOrder.DocDueDate = JSON.parse(poDetail)[0].DocDueDate;
            //--
            bodyPurchaseOrder.DocObjectCode = "22";
            bodyPurchaseOrder.DocDueDate = JSON.parse(poDetail)[0].DocDueDate;
            bodyPurchaseOrder.DocDate = JSON.parse(poDetail)[0].DocDueDate;

            bodySalesOrder.CardCode = process.env.SO_CARDCODE;
            bodyPurchaseOrder.CardCode = process.env.PO_CARDCODE;

            postOptionBFI.body = JSON.stringify(bodyPurchaseOrder);
            postOptionBFIDraft.body = JSON.stringify(bodyPurchaseOrder);
            postOptionREV.body = JSON.stringify(bodySalesOrder);

            postOptionREV.headers.Cookie = revCookie;
            postOptionBFI.headers.Cookie = bfiCookie;
            postOptionBFIDraft.headers.Cookie = bfiCookie;



        })

        // for (let i = 0; i < aSyncList.length; i++) {
        //     let U_DocEntry = aSyncList[i].U_PODocEntry;

        //GET PO DETAILS
        // getDocumentPO(U_DocEntry).then((res) => {

        //     var bodySalesOrder = {},
        //         bodyPurchaseOrder = {};
        //     bodySalesOrder.DocumentLines = [],
        //         bodyPurchaseOrder.DocumentLines = [];

        //     JSON.parse(res).forEach((e) => {
        //         var oItem = {};
        //         oItem.ItemCode = e.ItemCode;
        //         oItem.Quantity = e.Quantity;
        //         oItem.UnitPrice = e.Price;
        //         oItem.WarehouseCode = e.WhsCode;
        //         bodySalesOrder.DocumentLines.push(JSON.parse(JSON.stringify(oItem)));
        //         bodyPurchaseOrder.DocumentLines.push(JSON.parse(JSON.stringify(oItem)));
        //     })

        //     bodySalesOrder.NumAtCard = JSON.parse(res)[0].NumAtCard;
        //     bodyPurchaseOrder.NumAtCard = JSON.parse(res)[0].NumAtCard;

        //     bodySalesOrder.U_APP_IsDBTran = "1";
        //     bodyPurchaseOrder.U_APP_IsDBTran = "1";

        //     bodySalesOrder.Comments = `Based on REV Purchase Order DocEntry : ${JSON.parse(res)[0].DocEntry} | DocNum : ${JSON.parse(res)[0].DocNum}`;
        //     bodyPurchaseOrder.Comments = `Based on REV Purchase Order DocEntry : ${JSON.parse(res)[0].DocEntry} | DocNum : ${JSON.parse(res)[0].DocNum}`;

        //     bodySalesOrder.DocDueDate = JSON.parse(res)[0].DocDueDate;
        //     //--
        //     bodyPurchaseOrder.DocObjectCode = "22";
        //     bodyPurchaseOrder.DocDueDate = JSON.parse(res)[0].DocDueDate;
        //     bodyPurchaseOrder.DocDate = JSON.parse(res)[0].DocDueDate;

        //     bodySalesOrder.CardCode = process.env.SO_CARDCODE;
        //     bodyPurchaseOrder.CardCode = process.env.PO_CARDCODE;

        //     postOptionBFI.body = JSON.stringify(bodyPurchaseOrder);
        //     postOptionBFIDraft.body = JSON.stringify(bodyPurchaseOrder);
        //     postOptionREV.body = JSON.stringify(bodySalesOrder);

        //     postOptionREV.headers.Cookie = revCookie;
        //     postOptionBFI.headers.Cookie = bfiCookie;
        //     postOptionBFIDraft.headers.Cookie = bfiCookie;


        //     postBFIDraft().then((res) => {
        //         console.log(`BFO Purchase Order Draft Number : ${JSON.parse(res.body).DocEntry}`);
        //         var draftPODocEntry = JSON.parse(res.body).DocEntry;

        //         const test = async () => {
        //             let users = await getUsers();
        //             console.log(users);
        //             console.log("-------");
        //         }

        //         test();

        //         // 
        //         // 
        //         // let users = await getUsers();

        //         // Promise.all(
        //         //     users.map(async user => { 
        //         //       console.log(user) 
        //         //     })
        //         //   )
        //         // console.log(users);
        //     }).catch((err) => {
        //         console.log(err);
        //     });

        //     // let docNum = await postBFI();
        //     // console.log(docNum);

        //     // postREV().then((res) => {
        //     //     console.log(`REV Sales Order DocNum : ${res}`);

        //     //     postBFI().then((resbfi) => {
        //     //         console.log(`BFI Purchase Order DocNum : ${resbfi}`);
        //     //     }).catch((errbfi) => {
        //     //         console.log("error postBFI");
        //     //     })

        //     // }).catch((err) => {
        //     //     console.log("error postREV");
        //     // })

        //     // var returnVal = syncrequest('POST',
        //     //     process.env.bydurl + "/sap/byd/odata/cust/v1/c_productservice/ServiceProductCollection?" +
        //     //     "$filter=InternalID eq '" + sTransTypeFee + "'&$expand=ServiceProductSalesProcessInformation", {
        //     //         headers: {
        //     //             'Accept': 'application/json',
        //     //             'Authorization': 'Basic ' + encryptedCred
        //     //         }
        //     //     }
        //     // );


        // });

        // }

    }).catch((err) => {
        console.log(err);
    });

}

start();