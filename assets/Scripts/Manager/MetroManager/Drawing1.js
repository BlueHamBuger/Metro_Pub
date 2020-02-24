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
        this.speed = 1
        this.cur_length = 0
        this._is_fading = false
    },
    init(line) {
        this._line = line
    },
    Draw(touch_pos, entity) {
        let route_info = this.routes[this.routes.length - 1]
        if (entity != null) { // 触碰到了 station
            if (route_info != null) {
                if (route_info.entity != entity) { //进入新的结点
                    this._routeToward(route_info, entity.node.position)
                } else {
                    route_info.route.active = false
                    return
                }
            }
            var route = cc.instantiate(this.route_prefab) // TODO 路线对象池
            this.routes.push({ route: route, entity: entity })
            route.setParent(this._line.node)
            route.setPosition(entity.node.position)
            route.active = false
        } else if (route_info == null) {
            return
        } else {
            this._routeToward(route_info, touch_pos)
        }
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
        this.speed = speed
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
        this.speed = 1
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
        let forward_length = this.speed * 5
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