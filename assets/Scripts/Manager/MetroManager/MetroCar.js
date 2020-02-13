// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html
cc.Class({
    extends: cc.Component,

    properties: {
        speed: 1, // 速度 代表 车辆前进的长度
        cur_pop: { // 当前的人数
            default: 0,
            type: cc.Integer
        },
        pop_limit: { // 乘坐上限
            default: 100,
            type: cc.Integer
        },
        car_head: {
            default: null,
            type: cc.Node,
        },
        car_body: {
            default: [],
            type: [cc.Node],
        },
    },
    ctor() {
        this.route = {} // 记录 车头在各个位置的方向 ， 以来确定各个车身 在对应位置的  朝向
        this.start_pos = cc.v2(0, 0) // 开始结点应该是 车头在 起点位置的 时候的 车尾的位置
            //this.route = new MetroRoute()
    },
    start() {
        let that = this
        this.default_pos = function() {
            let a = []
            that.car_body.forEach(body => {
                a.push(body.position)
            });
            return a
        }();
    },
    update(dt) {},
    onRunEnter(pos, dir) {
        this.node.setPosition(pos)
        this.node.angle = cc.Vec2.UP.signAngle(dir) * 180 / Math.PI;
    },
    onRun(pos, dir) {
        if (dir == null) return
        let for_pos = this.car_head.getPosition();
        let new_pos = for_pos.lerp(this.node.convertToNodeSpaceAR(pos), 0.25)
        this.car_head.setPosition(new_pos);
        let angle = cc.Vec2.UP.signAngle(dir) * 180 / Math.PI;
        let new_angle = cc.misc.slerp(this.car_head.angle, angle - this.node.angle, 0.1)
        this.car_head.angle = new_angle
        for (let i = 0; i < this.car_body.length; i++) {
            let body = this.car_body[i]
            new_pos = body.position.lerp(new_pos.sub(cc.Vec2.UP.rotate(new_angle * Math.PI / 180).mul(500)), 0.7)
            body.setPosition(new_pos)
            new_angle = cc.misc.slerp(body.angle, new_angle, 0.1)
            if (new_angle == null) {
                new_angle = body.angle
            } else {
                body.angle = new_angle
            }
        }
    },
    onRunExit() {
        this.car_head.setPosition(0, 0)
        this.car_head.angle = 0
        for (let i = 0; i < this.car_body.length; i++) {
            this.car_body[i].setPosition(this.default_pos[i])
            this.car_body[i].angle = 0
        }
    }

});

// var MetroRoute = function() {
//     this.route = [] // 每一个索引位置记录当前的位置上的 角度
//     this._route_data = [] // 存储对应的数据
//     this.start_point = null
//     this.init = (pos) => {
//         this.start_point = pos
//     }
//     this.clear = () => {
//         this.route.length = 0
//         this._route_data.length = 0
//         this.start_point = null
//     }
//     this.addRoute = (pos, angle) => {
//         this.route.push(pos.sub(this.start_point).mag())
//         this._route_data.push(angle) // 当前数据暂是 角度
//     }
//     this.getData = (pos) => {
//         let dist = pos.sub(this.start_point).mag()
//         for (let i = 0; i < this.route.length; i++) {
//             if (this.route[i] < dist) {
//                 continue
//             } else if (this.route[i] == dist) {
//                 return this._route_data[i]
//             } else {
//                 let base = (i - 1 == -1) ? 0 : this.route[i - 1]
//                 let diff = dist - base
//                 let percent = diff / (this.route[i] - base)
//                 return cc.misc.slerp(base, this._route_data[i], percent)
//             }
//         }
//         return null
//     }
// }