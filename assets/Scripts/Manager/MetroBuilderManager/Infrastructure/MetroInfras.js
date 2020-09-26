// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

var Infrastructure = require("Infrastructure")
var FSM = require("StateMachine")
var MetroState = window.GB_MetroState = {
    Wait: 0, //在站点等待
    GetIn: 1, //进入下一个 floor 的位置
    Depart: 2, // 出发

}
var MetroInfras = cc.Class({
    extends: Infrastructure,

    statics: {
        StateFunc: FSM.genFuncs(MetroState),
    },

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {},

    ctor() {
        this.fsm = new FSM(MetroInfras.StateFunc, this)
        this.type = Infrastructure.InfrasTypes.Metro
        this.speed = 1.0 // 运行速度
        this.capacity = 10 // 运载人数
        this.passenger_num = 0 //车上人数
        this.stop_station_limit = 3 // 停站上限
        this.stop_station_num = 0 //已停战次数


        this._elapsed_time = 0
        this._wait_time = 3
        this._wait_pos = null

    },
    start() {
        this._super(null)
    },
    spawn(track_infras) { //
        this.track = track_infras

    },
    update(dt) {
        this._elapsed_time += dt
    },
    onWaitStart() {

    },
    onWait() {

    },
    onWaitExit() {

    },
    onGetIn() {

    },
    onGetInStart() {
        this._wait_pos
    },
    onGetInExit() {

    }


    // update (dt) {},
});