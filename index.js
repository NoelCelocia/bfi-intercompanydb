const request = require('request');
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;



function start() {

    //GET ALL NOT YET SYNCED
    var options = {
        'method': 'GET',
        'url': 'https://18.136.35.41:4300/app_xsjs/ExecQuery.xsjs?dbName=REVIVE_APPTECH_INTERNAL&procName=spAppIntercompany&queryTag=getlogs&value1=0&value2&value3&value4',
        'headers': {
            'Authorization': 'Basic U1lTVEVNOlBAc3N3MHJkODA1fg=='
        }
    };

    var getPODetails = {
        'method': 'GET',
        'url': 'https://18.136.35.41:4300/app_xsjs/ExecQuery.xsjs?dbName=REVIVE_APPTECH_INTERNAL&procName=spAppIntercompany&queryTag=getallpoforbfi&value1=&value2&value3&value4',
        'headers': {
            'Authorization': 'Basic U1lTVEVNOlBAc3N3MHJkODA1fg=='
        }
    };

    var loginOption = {
        'method': 'POST',
        'url': 'https://18.136.35.41:50000/b1s/v1/Login',
        'headers': {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "CompanyDB": "BIOTECH_FARMS_INC_APPTECH_INTERNAL",
            "Password": "1234",
            "UserName": "apptech05"
        })

    };

    var postingOption = {
        'method': 'POST',
        'url': '',
        'headers': {
            'Content-Type': 'application/json',
            'Cookie': ''
        },
        'body': ""
    }

    //GET DATA FROM REVIVE VIA XSJS
    request(options, (error, response) => {
        if (error) throw new Error(error);

        if (JSON.parse(response.body).length === 0) {
            console.log("No records to be sync");
            return;
        }
        // console.log(response.body);
        //LOGIN
        var cookies;
        request(loginOption, (logerror, logresponse) => {
            if (logerror) console.log(logerror);
            cookies = logresponse.headers["set-cookie"];
            console.log(cookies);
            JSON.parse(response.body).forEach((e) => {
                var docEntry = e.U_PODocEntry;
                console.log(docEntry);

                var urlReplace = getPODetails.url;
                urlReplace.replace("value1=", "value1=" + docEntry);
                getPODetails.url = urlReplace;

                //GET PO WHOLE DETAILS
                var getPODetailsOptions = JSON.parse(JSON.stringify(getPODetails));
                request(getPODetailsOptions, (err, resp) => {
                    if (err) throw new Error(err);
                    console.log(resp.body);

                    var slBodyPO = {};
                    slBodyPO.DocumentLines = [];
                    JSON.parse(resp.body).forEach((e) =>{
                        var oItem = {};
                        oItem.ItemCode = e.ItemCode;
                        oItem.Quantity = e.Quantity;
                        oItem.PriceAfVat = e.PriceAfVat;
                        slBodyPO.DocumentLines.push(JSON.parse(JSON.stringify(oItem)));
                    })

                    slBodyPO.CardCode = JSON.parse(resp.body)[0].CardCode;
                    slBodyPO.NumAtCard = JSON.parse(resp.body)[0].NumAtCard;

                    console.log(slBodyPO);


                    postingOption.headers.Cookie = cookies;
                    //POST IN ENGINE SCRIPT FOR BFI
                    request(postingOption, (errpost, resppost) => {
                        if (errpost) throw new Error(errpost);

                        

                    });



                });


            })

        })


    });





}

start();


//PUSH TO BFI AND REV