// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

var FSM = require("StateMachine")
var Infrastructure = require("Infrastructure")
var MetroState = window.GB_MetroState = {
    Wait: 0, //在站点等待
    GetIn: 1, //进入下一个 floor 的位置
    Depart: 2, // 离开
    Away: 3, // 远离车站
}
var Metro = cc.Class({
    extends: cc.Component,

    statics: {
        StateFunc: FSM.genFuncs(MetroState),
    },
    properties: {
        head_mesh: {
            type: cc.Prefab,
            default: null
        },
        body_mesh: {
            type: cc.Prefab,
            default: null
        },
        head_root: {
            type: cc.Node,
            default: null,
        },
        body_root: {
            type: cc.Node,
            default: null,
        },
        head: {
            type: cc.Node,
            default: null,
        },
        bodies: {
            type: [cc.Node],
            default: [],
        },
        length: {
            get() {
                return this.bodies.length
            },
        },
        size: cc.v2()
    },

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {},

    ctor() {
        this.fsm = new FSM(Metro.StateFunc, this)
        this.speed = 1.0 // 运行速度
        this.capacity = 10 // 运载人数
        this.passenger_num = 0 //车上人数
        this.stop_station_limit = 3 // 停站上限
        this.stop_station_num = 0 //已停战次数
        this._elapsed_time = 0
        this._wait_time = 3
        this._wait_pos = null

        // depart 属性
        this.next_pos = null // 下一个位置
        this.start_pos = null
        this.depart_time = 0
    },
    start() {},
    init(track_infras, length) { //
        this.track = track_infras
        for (let i = 0; i < length; i++) {
            let body = cc.instantiate(this.body_mesh)
            body.setParent(this.body_root)
            body.setPosition(0, 0, (i + 1) * this.size.y)
            this.bodies.push(body)
        }
        this.fsm.setState(MetroState.Depart)
    },
    update(dt) {
        this._elapsed_time += dt
        this.fsm.update(dt)
    },
    onWaitEnter() {
        this.track.onMetroWaitEnter(this.stop_station_num - 1, this)
    },
    onWait() {
        if (this._elapsed_time < this._wait_time) {

        } else {
            this._elapsed_time = 0
            this.fsm.setState(MetroState.Depart)
        }
    },
    onWaitExit() {

        this.track.onMetroWaitExit(this.stop_station_num - 1, this)
    },
    onGetIn() { //进入站点

    },
    onGetInEnter() {
        this._wait_pos
    },
    onGetInExit() {

    },
    onDepartEnter() {
        this.start_pos = this.node.getPosition()
        if (this.stop_station_num == this.stop_station_limit)
            this.next_pos = null
        else
            this.next_pos = this.track.getNextWaitPos(this.stop_station_num++)
        if (this.next_pos == null || this.next_pos == undefined) {
            // 设置最终位置超过 第一个车身
            this.next_pos = cc.v3(0, 0, -(this.track.size.y + this.size.y))
            let dist = Math.abs(this.start_pos.z - this.next_pos.z)
            this.depart_time = dist * 0.1 / this.speed
            cc.tween(this.node).to(this.depart_time, { position: { value: this.next_pos, easing: "sineInOut" } }).call(() => {
                this.fsm.setState(MetroState.Away)
            }).start()
        } else {
            this.next_pos = cc.v3(0, 0, this.next_pos.z)
            let dist = Math.abs(this.start_pos.z - this.next_pos.z)
            this.depart_time = dist * 0.1 / this.speed
            cc.tween(this.node).to(this.depart_time, { position: { value: this.next_pos, easing: "sineInOut" } }).call(() => {
                this.fsm.setState(MetroState.Wait)
            }).start()
        }
    },
    onDepart() {
        // if (this._elapsed_time < this.depart_time) {
        //     // let rate = this._elapsed_time / this.depart_time
        //     // this.node.setPosition(this.start_pos.lerp(this.next_pos, rate))
        // } else {
        //     this._elapsed_time = 0
        //     if (this.node.getPosition().z > this.track.size.y) {
        //         this.fsm.setState(MetroState.Away)
        //     } else {
        //         this.fsm.setState(MetroState.Wait)
        //     }
        // }
    },
    onDepartExit() {
        this._elapsed_time = 0
    },
    onAwayEnter() {
        Infrastructure.MetroMng.gameMng.addCoin(this.passenger_num)
        this.node.destroy()
    },
    onAwayExit() {},

    //调用
    getOn(human) {
        if (this.passenger_num + 1 <= this.capacity) {
            this.passenger_num += 1
            return true
        } else {
            return false
        }
    }


    // update (dt) {},
});