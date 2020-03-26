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

    //POST REQUEST FOR BFI
    // var postBFI = new Promise((resolve, reject) => {
    //     console.log("Cookie for " +  postingOption.headers.Cookie);
    //     request(postingOption, (errpost, resppost) => {
    //         if (errpost) reject("Error : Request to POST in Engine Script BFI Purchase Order");

    //         if (JSON.parse(resppost.body).error) {
    //             console.log("BFI " + JSON.parse(resppost.body).error.message.value);
    //             reject(JSON.parse(resppost.body).error.message.value);
    //         } else {
    //             resolve({
    //                 "Transaction": "Purchase Order",
    //                 "DocEntry": JSON.parse(resppost.body).SalesOrderDetail.body.DocEntry,
    //                 "DocNum": JSON.parse(resppost.body).SalesOrderDetail.body.DocNum
    //             });
    //         }
    //     });
    // });

    // var postREV = new Promise((resolve, reject) => {
    //     console.log(postingOptionRev.headers.Cookie);
    //     request(postingOptionRev, (errpost, resppost) => {
    //         if (errpost) reject("Error : Request to POST in Engine Script REV Sales Order");

    //         if (JSON.parse(resppost.body).error) {
    //             console.log("REV " + JSON.parse(resppost.body).error.message.value);
    //             reject(JSON.parse(resppost.body).error.message.value);
    //         } else {
    //             resolve({
    //                 "Transaction": "Sales Order",
    //                 "DocEntry": JSON.parse(resppost.body).SalesOrderDetail.body.DocEntry,
    //                 "DocNum": JSON.parse(resppost.body).SalesOrderDetail.body.DocNum
    //             });
    //         }
    //     });
    // })
    
    // Promise.all([
    //     logsl1,
    //     logsl2,
    //     getForSync
    // ]).then((results) => {
    //     bfiLoginCookie = results[0];
    //     revLoginCookie = results[1];
    //     oGetForSync = results[2];

    // }, allPostingOption);

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

        oGetForSync.forEach((e) => {
            var docEntry = e.U_PODocEntry;

            var urlReplace = getPODetails.url;
            urlReplace.replace("value1=", "value1=" + docEntry);
            getPODetails.url = urlReplace;

            var getPODetailsOptions = JSON.parse(JSON.stringify(getPODetails));
            request(getPODetailsOptions, (err, resp) => {
                var slBodyPO = {};
                slBodyPO.DocumentLines = [];
                JSON.parse(resp.body).forEach((e) => {
                    var oItem = {};
                    oItem.ItemCode = e.ItemCode;
                    oItem.Quantity = e.Quantity;
                    oItem.PriceAfVat = e.PriceAfVat;
                    slBodyPO.DocumentLines.push(JSON.parse(JSON.stringify(oItem)));
                })
                slBodyPO.CardCode = JSON.parse(resp.body)[0].CardCode;
                slBodyPO.NumAtCard = JSON.parse(resp.body)[0].NumAtCard;

                postingOption.body = JSON.stringify(slBodyPO);
                postingOptionRev.body = JSON.stringify(slBodyPO);
                

                //POST IN ENGINE SCRIPT FOR BFI 
                request(postingOption, (errpost, resppost) => {
                    if (errpost) throw new Error("Error : Request to POST in Engine Script BFI Purchase Order");
                    try {
                        if (JSON.parse(resppost.body).error) {
                            console.log(JSON.parse(resppost.body).error.message.value);
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
                    if (errpost) throw new Error("Error : Request to POST in Engine Script BFI Purchase Order");
                    try {
                        if (JSON.parse(resppost.body).error) {
                            console.log(JSON.parse(resppost.body).error.message.value);
                            //throw new Error(JSON.parse(resppost.body).error.message.value);
                        } else {
                            console.log(JSON.parse(resppost.body).SalesOrderDetail.body.DocNum);
                        }
                    } catch (err) {
                        console.log(err);
                    }

                });

                
            })
        })

    });


    return;
    // return;

    //GET DATA FROM REVIVE VIA XSJS
    // request(options, (error, response) => {
    //     if (error) {
    //         console.log("Error on GET DATA FROM REVIVE VIA XSJS");
    //         throw new Error(error);
    //     }

    //     if (JSON.parse(response.body).length === 0) {
    //         console.log("No records to be sync");
    //         return;
    //     }
    //     // console.log(response.body);
    //     //LOGIN
    //     var cookies;
    //     console.log(loginOption);

    //     request(loginOption, (logerror, logresponse) => {
    //         if (logerror) console.log(logerror);
    //         cookies = logresponse.headers["set-cookie"];
    //         console.log(cookies);

    //         var slBodyPO = {};
    //         slBodyPO.DocumentLines = [];
    //         JSON.parse(resp.body).forEach((e) => {
    //             var oItem = {};
    //             oItem.ItemCode = e.ItemCode;
    //             oItem.Quantity = e.Quantity;
    //             oItem.PriceAfVat = e.PriceAfVat;
    //             slBodyPO.DocumentLines.push(JSON.parse(JSON.stringify(oItem)));
    //         })

    //         slBodyPO.CardCode = JSON.parse(resp.body)[0].CardCode;
    //         slBodyPO.NumAtCard = JSON.parse(resp.body)[0].NumAtCard;

    //         slBodyPO = {
    //             "CardCode": "V00001",
    //             "DocDate": "2020-03-24",
    //             "NumAtCard": "Node Test",
    //             "DocumentLines": [{
    //                 "ItemCode": "RM14-00001",
    //                 "Quantity": 1,
    //                 "UnitPrice": 123
    //             }]
    //         }

    //         postingOption.headers.Cookie = cookies;
    //         postingOption.body = JSON.stringify(slBodyPO);
    //         //POST IN ENGINE SCRIPT FOR BFI
    //         request(postingOption, (errpost, resppost) => {
    //             if (errpost) throw new Error(errpost);

    //             console.log(JSON.parse(resppost.body));

    //         });
    //         // JSON.parse(response.body).forEach((e) => {
    //         //     var docEntry = e.U_PODocEntry;
    //         //     console.log(docEntry);

    //         //     var urlReplace = getPODetails.url;
    //         //     urlReplace.replace("value1=", "value1=" + docEntry);
    //         //     getPODetails.url = urlReplace;

    //         //     //GET PO WHOLE DETAILS
    //         //     var getPODetailsOptions = JSON.parse(JSON.stringify(getPODetails));
    //         //     request(getPODetailsOptions, (err, resp) => {
    //         //         if (err) throw new Error(err);
    //         //         // console.log(resp.body);
    //         //         var slBodyPO = {};
    //         //         slBodyPO.DocumentLines = [];
    //         //         JSON.parse(resp.body).forEach((e) =>{
    //         //             var oItem = {};
    //         //             oItem.ItemCode = e.ItemCode;
    //         //             oItem.Quantity = e.Quantity;
    //         //             oItem.PriceAfVat = e.PriceAfVat;
    //         //             slBodyPO.DocumentLines.push(JSON.parse(JSON.stringify(oItem)));
    //         //         })

    //         //         slBodyPO.CardCode = JSON.parse(resp.body)[0].CardCode;
    //         //         slBodyPO.NumAtCard = JSON.parse(resp.body)[0].NumAtCard;

    //         //         // console.log(slBodyPO);

    //         //         //start of mock data
    //         //         //bfi
    //         //         slBodyPO = {
    //         //             "CardCode": "V00001",
    //         //             "DocDate": "2020-03-24",
    //         //             "NumAtCard": "Node Test",
    //         //             "DocumentLines": [
    //         //                 {
    //         //                     "ItemCode": "RM14-00001",
    //         //                     "Quantity": 1,
    //         //                     "UnitPrice": 123
    //         //                 }

    //         //             ]
    //         //         }
    //         //         //end of mock data

    //         //         postingOption.headers.Cookie = cookies;
    //         //         postingOption.body = JSON.stringify(slBodyPO);
    //         //         //POST IN ENGINE SCRIPT FOR BFI
    //         //         request(postingOption, (errpost, resppost) => {
    //         //             if (errpost) throw new Error(errpost);

    //         //             console.log(JSON.parse(resppost.body).SalesOrderDetail.body.DocNum);

    //         //         });



    //         //     });


    //         // })

    //     })


    // });





}

start();


//PUSH TO BFI AND REV