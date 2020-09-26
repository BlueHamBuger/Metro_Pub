// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html
var MaxZIndex = cc.macro.MAX_ZINDEX
var MinZIndex = cc.macro.MIN_ZINDEX
var FSM = require("StateMachine")
var Infrastructure = require("Infrastructure")
var HumanState = window.GB_HumanState = {
    Idle: 0,
    Wonder: 1,
    GetOn: 2,
}
var Human = cc.Class({
    extends: cc.Component,
    statics: {
        wonder_time_min: 5,
        wonder_time_range: 5,
        idle_time_min: 5,
        idle_time_range: 5,
        StateFunc: FSM.genFuncs(HumanState),
        // 延迟绑定
        FloorInfras: function() { return require("FloorInfras") }()
    },

    properties: {
        skin: {
            type: cc.Node,
            default: null,
        },
        skin_root: {
            type: cc.Node,
            default: null,
        },
        position: {
            get() {
                return this._pos
            },
            set(value) {
                this._pos = value
                if (this.node != null) {
                    this.node.setPosition(this.floor_infras.node.convertToWorldSpaceAR(value))
                }
            }
        }
    },

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {},
    ctor() {
        this.fsm = new FSM(Human.StateFunc, this)
            // 该human 所处的 floor
        this.floor_infras = null;

        this._elapsed_time = 0.0
        this._next_dist = null; // 下一个移动位置的目的地
        this._wonder_time = 1.0 // 行走的时间
        this._idle_time = 1.0 // 静止时间
        this._speed = 1.0 // 行走的速度
        this._started = false
        this._pos = cc.Vec3.ZERO
            // for move
        this._start_pos = this._pos
            // true 为左 
            // false 为右
            //this._curdir = true
        this._get_on_rate = 0.7
        this._tar_metro = null
        this._get_on_tween = null
        this.idx = 0
    },
    start() {
        if (this._started == true) return
        let scale = Human.FloorInfras.std_mesh_scale
        this.position = cc.v3(0.0, Human.FloorInfras.std_floor_y * scale, 0.0)

        let cam = cc.Camera.main
        let cam_node = cam.node
            // 保持面向 摄像头  
            // console.log(cam_node.eulerAngles.y);

        this.skin.eulerAngles.y = cam_node.eulerAngles.y

        this.anim = this.getComponent(cc.Animation)
        this.fsm.setState(HumanState.Wonder)
        this._started = true
    },
    // 传入其所处的 infras
    init(floor_infras, idx) {
        this.floor_infras = floor_infras;
        this.idx = idx
    },
    update(dt) {
        this._elapsed_time += dt
        this.fsm.update(dt)
        this._calZIndex()
    },
    onIdleEnter() {
        this._elapsed_time = 0;
        this._idle_time = Human.idle_time_min + Math.random() * Human.idle_time_range
        this.anim.play("human_idle")
    },
    onWonderEnter() {
        this._elapsed_time = 0;
        this._wonder_time = Human.wonder_time_min + Math.random() * Human.wonder_time_range
        this._start_pos = this.position
        this._next_dist = this._getNextDist()

        let dir = this.floor_infras.node.convertToWorldSpaceAR(this._next_dist).sub(this.floor_infras.node.convertToWorldSpaceAR(this.position))
        dir = cc.v3(dir.x, 0.0, dir.z)

        let camera_forward = cc.v3(Infrastructure.MetroMng.camera_forward.x, 0.0, Infrastructure.MetroMng.camera_forward.z).normalize()
        let cross = dir.cross(camera_forward)

        if (cross.y >= 0) {
            this.skin_root.eulerAngles = cc.v3(0, 180, 0)

        } else {
            this.skin_root.eulerAngles = cc.v3(0, 0, 0)
        }
        this.anim.play("human_walk")
    },
    onIdle(dt) {
        if (this._elapsed_time >= this._idle_time) {
            this.fsm.setState(HumanState.Wonder)
        } else {
            // do something here
            return;
        }
    },
    onWonder(dt) {
        if (this._elapsed_time >= this._wonder_time) {
            this.fsm.setState(HumanState.Idle)
        } else if (!this._tryGetOn()) {
            this._Move();
        }
    },
    onGetOnEnter() {
        this._elapsed_time = 0
        let car_pos = null //this._tar_metro.node.convertToWorldSpaceAR(this._tar_metro.node.getPosition())
        let this_pos = this.node.parent.convertToWorldSpaceAR(this.node.getPosition())
        let tar_pos = null

        if (this._tar_metro.track.dir) {
            car_pos = Infrastructure.MetroMng.idx2pos(this._tar_metro.track.idx)
            tar_pos = cc.v3(car_pos.x, this_pos.y, this_pos.z)
        } else {
            car_pos = Infrastructure.MetroMng.idx2pos(cc.v2(this._tar_metro.track.idx.x + 1, this._tar_metro.track.idx.y))
            tar_pos = cc.v3(car_pos.x, this_pos.y, this_pos.z)
        }
        let time = Math.abs(tar_pos.x - this_pos.x) / (this._speed * (10.0 + Math.random() * 5.0))
        tar_pos = this.node.parent.convertToNodeSpaceAR(tar_pos)

        this._get_on_tween = cc.tween(this.node).to(time, { position: { value: tar_pos, easing: "sineInOut" } }).call(() => {
            this.getOn(this._tar_metro)
        })
        this._get_on_tween.start()
    },

    // 通知车辆的来去
    informWait(metro) {
        let r = Math.random()
        if (r < this._get_on_rate) {
            this._tar_metro = metro
            this.fsm.setState(HumanState.GetOn)
        }
    },
    informDepart(metro) {
        console.log("apart");
        this._tar_metro = null
        if (this._get_on_tween != null) {
            this._get_on_tween.stop()
            this._pos = this.floor_infras.node.convertToNodeSpaceAR(this.node.parent.convertToWorldSpaceAR(this.node.getPosition()))
        }
        this.fsm.setState(HumanState.Idle)
    },
    getOn(metro) {
        if (metro.getOn(this)) {
            this.floor_infras.removeHuman(this)
            this.node.destroy()
        } else {
            this.setState(HumanState.Idle)
        }

    },


    // privates
    // 获取下次移动的时候的位置
    _getNextDist() {
        let FloorInfras = Human.FloorInfras
            // 范围 是  车站的范围
        let scale = FloorInfras.std_mesh_scale
        let range = { x: 0.0, z: 0.0, x_range: FloorInfras.std_floor_x * scale, z_range: -FloorInfras.std_floor_z * scale }
        let distX = Math.random() * range.x_range
        let distZ = Math.random() * range.z_range
        return cc.v3(range.x + distX, this.node.y, range.z + distZ)
    },
    _Move() { //人物的随机走动
        let rate = this._elapsed_time / this._wonder_time;
        this.position = this._start_pos.lerp(this._next_dist, rate)
            // this.node.setPosition(this.node.getPosition().lerp(this._next_dist, rate))
    },
    _calZIndex() {
        let camera_forward = cc.v3(Infrastructure.MetroMng.camera_forward.x, 0.0, Infrastructure.MetroMng.camera_forward.z).normalize()
        let world_pos = this.node.convertToWorldSpaceAR(this.node.getPosition())
        let sub = cc.v3(world_pos.x, 0.0, world_pos.z)
        let dist = sub.dot(camera_forward)
        this.node.zIndex = Math.floor(MaxZIndex - (dist * 5))
    },

    // 尝试上车
    // 返回值是 是否上车
    // true 为 是  false 为否
    _tryGetOn() {
        //如果有车到站了并且处于开门状态
        // 那么 通过 一个随机数代表上车的期望 决定是否上车

        return false
    }

});