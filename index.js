const request = require('request');
require('custom-env').env('dev');
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;



function start() {

    var base64XSJSCredential = Buffer.from(process.env.XSJS_USERNAME + ":" + process.env.XSJS_PASSWORD).toString('base64');

    //GET ALL NOT YET SYNCED
    var options = {
        'method': 'GET',
        'url': process.env.XSJS_BASE_URL + '/app_xsjs/ExecQuery.xsjs?dbName=REVIVE_APPTECH_INTERNAL&procName=spAppIntercompany&queryTag=getlogs&value1=0&value2&value3&value4',
        'headers': {
            'Authorization': 'Basic ' + base64XSJSCredential
        }
    };

    var getPODetails = {
        'method': 'GET',
        'url': process.env.XSJS_BASE_URL + '/app_xsjs/ExecQuery.xsjs?dbName=REVIVE_APPTECH_INTERNAL&procName=spAppIntercompany&queryTag=getallpoforbfi&value1=&value2&value3&value4',
        'headers': {
            'Authorization': 'Basic ' + base64XSJSCredential
        }
    };

    var loginOption = {
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

    var loginOptionRev = {
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
    }

    var postingOption = {
        'method': 'POST',
        'url': process.env.SL_BASE_URL + '/script/apptech/BFIpurchaseorder',
        'headers': {
            'Content-Type': 'application/json',
            'Cookie': ''
        },
        'body': ""
    }

    var postingOptionRev = {
        'method': 'POST',
        'url': process.env.SL_BASE_URL + '/script/apptech/REVsalesorder',
        'headers': {
            'Content-Type': 'application/json',
            'Cookie': ''
        },
        'body': ""
    }

    console.log("LOGGING IN...");
    var bfiLoginCookie, revLoginCookie;

    var logsl1 = new Promise((resolve, reject) => {
        request(loginOption, (logerror, logresponse) => {
            if (logerror) reject("reject");
            resolve(logresponse.headers["set-cookie"]);
        });
    });

    var logsl2 = new Promise((resolve, reject) => {
        request(loginOptionRev, (logerror2, logresponse2) => {
            if (logerror2) {
                console.log("Error on Login Revive")
                reject("reject")
            }
            resolve(logresponse2.headers["set-cookie"]);
        });
    });

    var getForSync = new Promise((resolve, reject) => {
        request(options, (error, response) => {
            if (error) {
                console.log("Error on getForSync");
                reject("Reject on getForSync");
            }
            resolve(JSON.parse(response.body));
        });
    })

    Promise.all([
        logsl1,
        logsl2,
        getForSync
    ]).then((results) => {
        bfiLoginCookie = results[0];
        revLoginCookie = results[1];
        oGetForSync = results[2];

        
        postingOption.headers.Cookie = bfiLoginCookie;
        postingOptionRev.headers.Cookie = revLoginCookie;

        console.log(`Numbers of Records: ${oGetForSync.length}`)
        oGetForSync.forEach((e) => {
            var docEntry = e.U_PODocEntry;
            

            var urlReplace = getPODetails.url;
            urlReplace = urlReplace.replace("value1=", "value1=" + docEntry);
            getPODetails.url = urlReplace;


            var getPODetailsOptions = JSON.parse(JSON.stringify(getPODetails));
            request(getPODetailsOptions, (err, resp) => {
                var bodySalesOrder ={}, bodyPurchaseOrder = {};
                bodySalesOrder.DocumentLines = [], bodyPurchaseOrder.DocumentLines = [];
                
                JSON.parse(resp.body).forEach((e) => {
                    var oItem = {};
                    oItem.ItemCode = e.ItemCode;
                    oItem.Quantity = e.Quantity;
                    oItem.UnitPrice = e.Price;
                    oItem.WarehouseCode = e.WhsCode;
                    bodySalesOrder.DocumentLines.push(JSON.parse(JSON.stringify(oItem)));
                    bodyPurchaseOrder.DocumentLines.push(JSON.parse(JSON.stringify(oItem)));
                });
                bodySalesOrder.NumAtCard = JSON.parse(resp.body)[0].NumAtCard;
                bodyPurchaseOrder.NumAtCard = JSON.parse(resp.body)[0].NumAtCard;

                bodySalesOrder.U_APP_IsDBTran = "1";
                bodyPurchaseOrder.U_APP_IsDBTran = "1";

                bodySalesOrder.Comments = `Based on REV Purchase Order DocEntry : ${JSON.parse(resp.body)[0].DocEntry} | DocNum : ${JSON.parse(resp.body)[0].DocNum}`;
                bodyPurchaseOrder.Comments = `Based on REV Purchase Order DocEntry : ${JSON.parse(resp.body)[0].DocEntry} | DocNum : ${JSON.parse(resp.body)[0].DocNum}`;

                bodySalesOrder.DocDueDate = JSON.parse(resp.body)[0].DocDueDate;
                bodyPurchaseOrder.DocDueDate = JSON.parse(resp.body)[0].DocDueDate;
                bodyPurchaseOrder.DocDate = JSON.parse(resp.body)[0].DocDueDate;

                bodySalesOrder.CardCode = process.env.SO_CARDCODE;
                bodyPurchaseOrder.CardCode = process.env.PO_CARDCODE;
                

                postingOption.body = JSON.stringify(bodyPurchaseOrder);
                postingOptionRev.body = JSON.stringify(bodySalesOrder);
                

                //POST IN ENGINE SCRIPT FOR BFI 
                request(postingOption, (errpost, resppost) => {
                    if (errpost) throw new Error("Error : Request to POST in Engine Script BFI Purchase Order");
                    try {
                        if (JSON.parse(resppost.body).error) {
                            console.log(`SAP Error on Posting BFI PO for REV PO DocEntry ${docEntry}: \t${JSON.parse(resppost.body).error.message.value}  `)
                            //throw new Error(JSON.parse(resppost.body).error.message.value);
                        } else {
                            console.log(JSON.parse(resppost.body).SalesOrderDetail.body.DocNum);
                        }
                    } catch (err) {
                        console.log(err);
                    }

                });

                //POST IN ENGINE SCRIPT FOR REV 
                request(postingOptionRev, (errpost, resppost) => {
                    if (errpost) throw new Error("Error : Request to POST in Engine Script REV Sales Order");
                    try {
                        if (JSON.parse(resppost.body).error) {
                            console.log(`SAP Error on Posting REV SO fpr REV PO DocEntry ${docEntry}: \t${JSON.parse(resppost.body).error.message.value}  `)
                            
                        } else {
                            console.log(`Success on posting to Revive Database Sales Order Number ${JSON.parse(resppost.body).SalesOrderDetail.body.DocNum}`);
                        }
                    } catch (err) {
                        console.log(err);
                    }

                });
                
            })
        })

    });

}

start();


//PUSH TO BFI AND REV