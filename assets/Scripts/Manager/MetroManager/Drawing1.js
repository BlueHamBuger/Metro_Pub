var MetroLine = require("MetroLine")
cc.Class({
    extends: require("Drawing"),
    properties: {
        route_limit: 10, // 线路的长度限制
        rest_length: 0,
        route_prefab: {
            default: null,
            type: cc.Prefab,
        }
    },
    ctor() {
        this.routes = []
        this.tail = null
        this.head = null
        this.other_speed = 1
        this.cur_length = 0
        this._is_fading = false
    },
    init(line) {
        this._line = line
    },
    Draw(touch_pos, entity) {
        let route_info = this.routes[this.routes.length - 1]
        if (route_info == null) {
            return
        } else if (entity == route_info.entity) {
            route_info.route.active = false
        } else {
            this._routeToward(route_info, touch_pos)
        }
    },
    addRoute(entity) {
        let route_info = this.routes[this.routes.length - 1]
        if (route_info != null) {
            this._routeToward(route_info, entity.node.position)
            var speed = 1
            if (route_info.entity.city_data != null && entity.city_data != null) {
                if (route_info.entity.city_data == entity.city_data) {
                    speed += MetroLine.city_speed_bonus
                    if (route_info.entity.line_data == entity.line_data) {
                        speed += MetroLine.line_speed_bonus
                    }
                } else {
                    speed += MetroLine.diff_city_speed_bonus
                }
            }
            route_info.speed = speed
        }
        var route = cc.instantiate(this.route_prefab) // TODO 路线对象池
        this.routes.push({ route: route, entity: entity, speed: 1 })
        route.setParent(this._line.node)
        route.setPosition(entity.node.position)
        route.active = false
    },
    update(dt) {
        if (this._is_fading) {
            this._Running()
        }
    },
    //  外部回调
    onBuildExit(speed) { // 
        this.tail = this.routes[0].route.position
        if (this.routes[this.routes.length - 1].route.active == false) { // 最后一个结点并没有使用
            this.routes.length--
        }
        this.startFade(speed)
    },
    onRun(speed) {
        this.other_speed = speed
        this._is_fading = true
    },
    onWaitEnter() {
        this._is_fading = false
    },
    hasRoute() { //是否 有轨道
        let route_info = this.routes[0]
        return route_info != null && route_info.route.active == true
    },
    getTail() { // 获取尾部结点的 位置
        return this.tail
    },
    getDir() { // 获取 当前尾部的运动方向
        if (this.routes.length == 0) {
            return null
        } else if (this.routes[0].dir == null) {
            return null
        }
        return this.routes[0].dir.normalize()
    },
    getHead() { // 获取头部节点 的 位置
        // return this.graphics._impl._points[this.graphics._impl._points.length - 1]
    },
    resetDrawing() {
        this.routes.length = 0
        this.tail = null
        this.head = null
        this.other_speed = 1
        this.cur_length = 0
        this._is_fading = false
    },

    // 私有
    _routeToward(route_info, touch_pos) {
        let route = route_info.route
        route.active = true
        let dir = touch_pos.sub(route.position)
        route_info.dir = dir
        let dist = dir.mag()
        route.height = dist
        route.angle = Math.raduis2Angle(cc.Vec2.UP.signAngle(dir))
    },
    _Running() {
        if (this.routes.length == 0) return
        let route_info = this.routes[0]
        let route_length = route_info.route.height // 道路的长度
        let forward_length = this.other_speed * route_info.speed * 5
        if (this.cur_length + forward_length >= route_length) {
            forward_length = route_length - this.cur_length
            this.cur_length = 0
            let route = this.routes.shift().route
            this._routeFade(route)
        } else {
            this.cur_length += forward_length
        }
        this.tail = this.tail.add(route_info.dir.normalize().mul(forward_length))
    },

    //animations
    _routeFade(route) { // 道路逐渐消失
        cc.tween(route).to(0.5, {
            opacity: 0
        }).call(() => {
            route.destroy()
        }).start()
    }
})