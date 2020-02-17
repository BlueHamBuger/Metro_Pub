// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html
var MetroCar = cc.Class({
    extends: cc.Component,

    properties: {
        speed: 1, // 速度 代表 车辆前进的长度
        cap_per_body: { // 每节车厢可以容纳的人数上限
            default: 50,
            type: cc.Integer,
        },
        cur_pop: { // 当前的人数
            default: 0,
            type: cc.Integer,
            visible: false,
        },
        car_name: {
            default: " ",
        },
        car_head: {
            default: null,
            type: cc.Node,
        },
        car_body: {
            default: null,
            type: cc.Node,
        },
        pop_label: {
            default: null,
            type: cc.Label
        }
    },
    ctor() {
        this.route = {} // 记录 车头在各个位置的方向 ， 以来确定各个车身 在对应位置的  朝向
        this.start_pos = cc.v2(0, 0) // 开始结点应该是 车头在 起点位置的 时候的 车尾的位置
        this.car_bodies = []
        this.id = 0
        this.capacity = 0
    },
    init(body_length, id) {
        if (body_length < 1) {
            throw "车身长度不能小于1"
        }
        this.car_bodies.length = body_length
        this.capacity = this.cap_per_body * body_length
        this.id = id

        this.body_diff = this.car_body.position.sub(this.car_head.position).mag()
        let props = MetroCar.car_props[this.id] //获取车辆数据
        this.car_bodies[0] = this.car_body // 车身   
        for (let key in props) {
            this[key] = props[key]
        }
        for (let i = 1; i < this.car_bodies.length; i++) {
            let new_body = cc.instantiate(this.car_body)
            this.car_bodies[i] = new_body
            new_body.setParent(this.node)
            new_body.setPosition(this.car_bodies[i - 1].getPosition().add(cc.v2(0, this.body_diff * i)))
        }
    },
    update(dt) {
        this.upadteEffects()
    },
    ready(pos, dir) {
        for (let i = 0; i < this.car_bodies.length; i++) {
            //this.car_bodies[i].setPosition(this.default_pos[i])
            this.car_bodies[i].angle = 0
        }
        this.node.setPosition(pos)
        this.node.angle = cc.Vec2.UP.signAngle(dir) * 180 / Math.PI;
        this.node.active = true
    },
    onRun(pos, dir) {
        if (dir == null) return
        let for_pos = this.car_head.getPosition();
        let new_pos = for_pos.lerp(this.node.convertToNodeSpaceAR(pos), 0.25)
        this.car_head.setPosition(new_pos);
        let angle = cc.Vec2.UP.signAngle(dir) * 180 / Math.PI;
        let new_angle = cc.misc.slerp(this.car_head.angle, angle - this.node.angle, 0.1)
        this.car_head.angle = new_angle
        for (let i = 0; i < this.car_bodies.length; i++) {
            let body = this.car_bodies[i]
            new_pos = body.position.lerp(new_pos.sub(cc.Vec2.UP.rotate(new_angle * Math.PI / 180).mul(500)), 0.7)
            body.setPosition(new_pos)
            new_angle = cc.misc.slerp(body.angle, new_angle, 0.25)
            if (new_angle == null) {
                new_angle = body.angle
            } else {
                body.angle = new_angle
            }
        }
    },
    onRunExit() {
        let for_pos = this.car_head.position
        this.car_head.setPosition(0, 0)
        this.car_head.angle = 0
        this.cur_pop = 0
        for (let i = 0; i < this.car_bodies.length; i++) {
            this.car_bodies[i].setPosition(this.car_bodies[i].position.sub(for_pos))
            this.car_bodies[i].angle = 0
        }
        this.node.active = false
    },
    upadteEffects() { // 特效更新
        this.pop_label.string = this.cur_pop
        this.pop_label.node.angle = -this.car_head.angle - this.node.angle // 让 label 保持不旋转
        this.car_bodies.forEach(body => {
            let ps = body.getComponentInChildren(cc.ParticleSystem)
            ps.totalParticles = this.cur_pop / this.car_bodies.length / 2
        });
    },
    //line 调用
    getOn(delta_pop) {
        let tar_pop = this.cur_pop + delta_pop
        if (tar_pop < 0) { // 减法
            delta_pop = -this.cur_pop // 
            tar_pop = 0;
        } else if (tar_pop > this.capacity) { // 加法
            tar_pop = this.capacity
            delta_pop = this.capacity - this.cur_pop
        }
        this.cur_pop = tar_pop
        return delta_pop
    },
    isEmpty() {
        return this.cur_pop == 0
    }

});