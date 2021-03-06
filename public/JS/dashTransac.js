var sessions = [];
var serviceTot = 0;
var serviceSelc = "";
var errorCount = 0;
var counter = 0;
var rooms = {};
var pdf;

var transaction = {
    loadSessions: function (cb) {
        $.get('admin/customerSessionList', function (res) {
            sessions = res;
            cb();
        });
    },
    addSession: function (_data, cb) {
        $.post('admin/addSession', _data, function (res) {
            if (res.error == 0) {
                sessions.push({ id: res.data, disID: res.display, data: _data });
                cb(0);
            } else {
                cb(1);
            }
        }).fail(function () {
            cb(1);
        });
    },
    delSession: function (_id, cb) {
        $.post('admin/delSession', { id: _id }, function (res) {
            if (res.error == 0) {
                cb(0);
            } else {
                cb(1);
            }
        }).fail(function () {
            cb(1);
        });
    },
    checkout: function (data, cb) {
        $.post('admin/recSession', data, function (res) {
            if (res.error == 0) {
                cb(0);
            } else {
                cb(1);
            }
        });
    },
    roomUpdate: function (action, data, cb) {
        $.post('admin/updateClient', {id: data}, function(res){
            if(res.error == 1){
                confirmFunction(-1);
            }else{
                cb();
            }
        });
    }
};

function sessionUpdate() {
    NProgress.start();
    var loadRooms = function (cb) {
        clearRooms();
        var count = sessions.length;
        sessions.forEach(x => {
            switch (x.data.room) {
                case '1': {
                    assignRoom(1, x);
                    rooms.room1 = true;
                    break;
                }
                case '2': {
                    assignRoom(2, x);
                    rooms.room2 = true;
                    break;
                }
                case '3': {
                    assignRoom(3, x);
                    rooms.room3 = true;
                    break;
                }
                case '4': {
                    assignRoom(4, x);
                    rooms.room4 = true;
                    break;
                }
                default: break;
            }
            count--;
            if (count === 0) return cb();            
        });
    }
    transaction.loadSessions(function () {
        var html1 = "";
        var html2 = "";
        sessions.forEach(x => {
            var html = "";
            var serv = servName[x.data.sID] == undefined ? x.data.sID : servName[x.data.sID];
            html += "<tr>";
            html += "<td>" + (x.data.stype == 1 ? ("RS-" + x.display) : ("HS-" + x.display)) + "</td>";
            html += "<td>" + x.data.name + "</td>";
            html += "<td>" + staffName[x.data.tID] + "</td>";
            html += "<td>" + serv + "</td>";
            html += "<td><button class='btn buttonFinish' id='btnDoneTrans' type='button' onclick='doneSession(\"" + x.id + "\")' title='Done' style='width: 50px;'><span class='fa fa-check'></span></button><button class='btn buttonPrevious' id='btnCancTrans' type='button' onclick='cancelSession(\"" + x.id + "\")' title='Cancel/Remove' style'width: 50px;'><span class='fa fa-times'></span></button></td>";
            html += "</tr>";
            if (x.data.stype == 1) {
                html1 += html;
            } else {
                html2 += html;
            }
        });
        $('.sessionList').html(html1 === "" ? "<tr><th colspan='5'><p>None</p></th></tr>" : html1);
        $('.homeSession').html(html2 === "" ? "<tr><th colspan='5'><p>None</p></th></tr>" : html2);
        $('#sessionNumber').html(sessions.length);
        operation.availStaff();
        loadRooms(function () {
            var html = "<option value='0'>---</option>";
            if (rooms.room1 === false) {
                html += "<option value='1'>Room #1</option>";
            }
            if (rooms.room2 === false) {
                html += "<option value='2'>Room #2</option>";
            }
            if (rooms.room3 === false) {
                html += "<option value='3'>Room #3</option>";
            }
            if (rooms.room4 === false) {
                html += "<option value='4'>Room #4</option>";
            }
            $('.assignRoom').html(html);
        });
        NProgress.done();
    });
}

function addToOrder() {
    if ($('#serviceSS').val() !== null) {
        var x = $('#serviceSS').val();
        $('#selectedServ').val($('#selectedServ').val() + servName[x] + "; \n");
        serviceTot += parseInt(servPrice[x + '']);
        $('#totAmtNs').val(serviceTot);
        serviceSelc += x + "/";
    }
}

function doneFreakingSession() {
    transaction.checkout({ id: selectedService, total: selectedStaff }, function (res) {
        if (res == 0) {
            sessions.splice(selectedService, 1);
            confirmFunction(7);
            sessionUpdate();
            loadDashboard();
            pdf.Receipt.download(pdf.filename);
        } else {
            if (errorCount == 0) {
                doneFreakingSession();
                errorCount++;
            } else {
                confirmFunction(-1, res.detail);
                errorCount = 0;
            }
        }
    });
}

function getSessionDetail(input) {
    var serv = input.data.sID.split('; \n');
    var price = 0;
    serv.forEach(x => {
        var name = x;

        if (x === '') {

        } else {
            var count = 0;
            service.services.forEach(y => {
                if (y.name === x) {
                    price += parseInt(y.amount);
                    var html = "<tr><!--<td>1</td>--><td>" + name + "</td><td>" + parseInt(y.amount).formatMoney(2, '.', ',') + "</td></tr>";
                    $('#servicesTable').append(html);
                    $('.fnlPrice').html((price).formatMoney(2, '.', ','));
                    selectedStaff = (price).formatMoney(2, '.', ',');
                }
                count++;
            });
        }
    });
}

function loadDashboard() {
    var topService = function(services, cb){
        var data = services.split('/');
        var top = [];
        var count = data.length;
        data.forEach(x=>{
            if(x==''){
            }else{
                var a = -1;
                for(var b=0; b<top.length; b++){
                    if(top[b][0] == x){
                        a = b;
                    }
                }
                if(a == -1){
                    top.push([x, 1]);
                }else{
                    top[a][1]++;
                }
            }
            count--;
            if(count === 0) return cb(top);
        });
    }
    $.get('admin/dashInfo', function (res) {
        $('.totTran').html(res.transaction);
        $('.totRes').html(res.reservation);
        $('.totColT').html(res.tsale == null ? "0.00" : res.tsale.formatMoney(2, '.', ','));
        $('.totColW').html(res.wsale == null ? "0.00" : res.wsale.formatMoney(2, '.', ','));
        var html = "", count = 1;
        res.topEmployee.forEach(x => {
            html += "<div><p><span class='fa fa-user-md'></span> " + x.name;
            html += "<span id='most" + count + "#'> (" + x.count + "<small> transactions</small>)</span></p>";
            html += "<div><div class='progress progress_sm' style='width: 80%;'>";
            html += "<div class='progress-bar bg-purple' role='progressbar' data-transitiongoal='" + x.count + "'></div></div>";
            html += "</div></div>"
        });
        $('.topThera').html(html);
        topService(res.services, function(_topService){
            var topService = _topService;
            var count = topService.length;
            for(var x=0; x<topService.length; x++){
                for(var y=x; y<topService.length; y++){
                    if(topService[y][1] > topService[x][1]){
                        var temp = topService[x];
                        topService[x] = topService[y];
                        topService[y] = temp;
                    }
                }
                count--;
                if(count === 0){
                    var html = "";
                    for(var a=0; a<3; a++){
                        html += "<div>";
                        html += "<p id='most"+ (a+1) +"'><span class='fa fa-heart'> "+ servName[''+(topService[a][0])] +"</span><span id='most"+ (a+1) +"#'> ("+ topService[a][1] +")</span></p>";
                        html += "<div><div class='progress progress_sm' style='width: 80%;'><div class='progress-bar bg-blue' role='progressbar' data-transitiongoal='"+ topService[a][1] +"'></div></div></div>";
                        html += "</div>";
                    }
                    $('.topService').html(html);
                    $(".progress .progress-bar").progressbar()
                } 
            }
        });
    });
}

function getServiceNames(data, done) {
    var arr = data.split('/');
    var count = arr.length;
    var names = "";
    arr.forEach(x => {
        if (x !== '') {
            names += servName[x] + "; \n";
        }
        count--;
        if (count == 0) {
            done(names);
        }
    });
}

function loadPastTransac() {
    $.get('admin/pastTransac', function (res) {
        if (res.error === 0) {
            var reg = "";
            var home = "";
            res.data.forEach(x => {
                getServiceNames(x.serviceID, function (names) {
                    var html = "<tr>";
                    html += "<td>" + x.id + "</td>";
                    html += "<td>" + x.customer + "</td>";
                    html += "<td>" + x.therapist + "</td>";
                    html += "<td>" + names + "</td>";
                    html += "<td>" + x.date + "</td>";
                    html += "</tr>";
                    if (x.serviceType == 1) {
                        reg += html;
                    } else {
                        home += html;
                    }
                });
            });
            $('.pastTransactionHome').html(home);
            $('.pastTransactionReg').html(reg);
        } else {
            confirmFunction(-1);
        }
    });
}

function sessionUpdatePast() {
    loadPastTransac();
}

function generateReceipt(_data) {
    var rID = Date.today().getFullYear().toString() + (Date.today().getMonth() + 1).toString() + Date.today().getDate().toString() + counter;
    var dd = {
        content: [
            { text: 'EFOREA NAIL AND BODY SPA', style: 'header' },
            { text: 'Official Receipt', style: 'subHeader' }, '\n\n',
            {
                columns: [
                    { width: '33%', text: 'From' },
                    { width: '33%', text: 'To' },
                    { width: '33%', text: 'Receipt #: ' + rID } //Data here
                ]
            }, '\n',
            {
                columns: [
                    { width: '33%', text: 'Eforea Nail and Body Spa\n Unit 102 #71 P. Tuazon St., Barangay Kaunlaran 1100 Quezon City, Philippines\n Phone: 0977 801 2700' },
                    { width: '33%', text: _data.data.name + '\n' + _data.data.address + '\n' + _data.data.contact }, //Data here
                    { width: '33%', text: 'Invoice Date: ' + Date.today().toString('MM/dd/yyyy') }
                ]
            }, '\n\n',
            {
                table: {
                    widths: ['*', 'auto'],
                    body: [
                        [{ border: [false, false, false, false], text: 'Service(s)' }, { border: [false, false, false, false], text: 'Amount' }],
                    ]
                },
                layout: {
                    fillColor: function (i, node) {
                        return (i % 2 === 1) ? '#CCCCCC' : null;
                    }
                }
            }, '\n\n',
            { text: 'Total Amount:', style: 'subHeader' },
            { text: '', style: 'subHeader' },
        ],

        styles: {
            header: {
                fontSize: 20,
                bold: true,
            },
            subHeader: {
                fontSize: 18,
                bold: true,
                alignment: 'right',
            },
            subHeader2: {
                fontSize: 15,
                bold: true,
                alignment: 'right',
            }
        }
    };

    var getTotalPrice = function (cb) {
        var serv = _data.data.sID.split('; \n');
        var price = 0;
        var total = 0;
        serv.forEach(x => {
            var name = x;

            if (x === '') {

            } else {
                var count = 0;
                service.services.forEach(y => {
                    if (y.name === x) {
                        price += parseInt(y.amount);
                        dd.content[7].table.body.push([y.name, parseInt(y.amount).formatMoney(2, '.', ',')]);
                        total = price.formatMoney(2, '.', ',');
                        cb(total);
                    }
                    count++;
                });
            }
        });
    }

    getTotalPrice(function (total) {
        dd.content[10].text = total;
        pdf = { Receipt: pdfMake.createPdf(dd), filename: 'receipt-' + rID + '.pdf' };
    });
    counter++;
}