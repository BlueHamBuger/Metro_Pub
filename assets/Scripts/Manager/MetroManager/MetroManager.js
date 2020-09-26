//总管 所有的 地铁站 包括其生成，布局 等等
// 需要保持有 一个 node pool
var MetroLine = require("MetroLine")
var MetroStation = require("MetroStation")
var LevelController = require("LevelController")
var MetroEntity = require("MetroEntity")
var Metro = cc.Class({
    extends: require("BaseManager"),
    properties: {
        layoutx: {
            default: 10,
            type: cc.Integer,
        },
        layouty: {
            default: 10,
            type: cc.Integer,
        },
        station_prefab: {
            default: null,
            type: cc.Prefab,
        },
        line_prefab: {
            default: null,
            type: cc.Prefab,
        },
        exit_prefab: {
            default: null,
            type: cc.Prefab,
        },
        hardThreashold: { // 难度变化的  阈值
            default: [],
            type: [cc.Integer]
        },
        score: {
            get() {
                return this._score
            },
            set(value) {
                this._score = value
            }
        }
    },
    ctor() {
        this.cur_line = null // 当前正在构建的 路线
        this.former_entity = null // 之前touch 的 station
        this._score = 0
        this.metroUpdate = this.hardOne // 游戏的更新逻辑 和 难度相关
        this._occupied_cells = [] // 被占用的 cells 
        this._exits = [] // 出口数量
        this.station_datas = null //站点数据
    },
    onGameStart() {
        this.station_root = this.node.getChildByName("Stations")
        this.line_root = this.node.getChildByName("Lines")
        MetroLine.metro_mng = this;
        MetroStation.metro_mng = this; // 设置 管理员
        Metro.station_size = this.station_prefab.data.getContentSize().width; // 初始化 station 的 size
    },
    update(dt) {
        if (this.station_root != null) { // 游戏未开始
            this.levelController.update(dt)
        }
    },
    initManager(gameMng) {
        this._super(gameMng)
            // 对象池初始化
        this._initPools();
        // 布局初始化
        this._initCells();
        // 事件监听
        this._initEvents();

        //关卡控制器设置
        this.levelController = new LevelController(this)

        //TEST 绘制 grid 以及 测试站点
        let graphic = this.node.getComponent(cc.Graphics);
        for (let i = 0; i < this.layouty; i++) {
            graphic.moveTo(0, i * this.cellheight)
            graphic.lineTo(this.width, i * this.cellheight)
        }
        for (let i = 0; i < this.layoutx; i++) {
            graphic.moveTo(i * this.cellwidth, 0)
            graphic.lineTo(i * this.cellwidth, this.height)
        }
        graphic.stroke();
        MetroEntity.MetroMng = this
            // for (let i = 0; i < 10; i++)
            //     this.randomGenStation();
    },
    //事件 及 回调函数
    _initEvents() {
        this.gameMng.listenToInput("touch_start", this.onTouchStart, this)
        this.gameMng.listenToInput("on_touch", this.onTouch, this)
        this.gameMng.listenToInput("touch_end", this.onTouchEnd, this)
        this.gameMng.listenToInput("touch_cancle", this.onTouchEnd, this)
    },


    onTouchStart(event) {
        var line = this.genLine();
        var pos = event.getLocation();
        var cellindex = this.getCellIndex(pos);
        if (cellindex == null) throw "Line 输入不在范围内"
        let entity = this.cells[cellindex[0]][cellindex[1]].entity
        this.onTouchEntity(entity, line, pos)

    },
    onTouch(event) {
        var line = this.cur_line
        var pos = event.getLocation();
        var cellindex = this.getCellIndex(pos);
        if (cellindex == null) throw "Line 输入不在范围内"
        let entity = this.cells[cellindex[0]][cellindex[1]].entity
        this.onTouchEntity(entity, line, pos)
    },
    onTouchEnd(event) {
        var pos = event.getLocation();
        var cellindex = this.getCellIndex(pos);
        if (cellindex == null) throw "Line 输入不在范围内"
        let entity = this.cells[cellindex[0]][cellindex[1]].entity
        if (entity != null && entity.isIn(pos)) {
            entity.onTouchEnd()
            this.former_entity = null
        }
        this.cur_line.buildOver();
        this.cur_line = null
    },
    onTouchEntity(entity, line, pos) { // 分别通知 line  和 station 当前触碰到了一个 station
        var entity_changed = true
        var entity_touched = false
        var former_entity = this.former_entity
        this.former_entity = null
        if (entity != null) {
            if (entity.isIn(pos)) {
                entity_touched = true
                if (entity != former_entity) { // 不是同一个 加入到  站点中
                    entity.onTouch();
                    if (line.addStation(entity)) { // 被成功添加了（如果有特殊条件）
                        entity.onAdded(line) // 触发station 的  onAdded函数 告知其被加入了
                    }
                } else {
                    entity_changed = false
                }
                this.former_entity = entity

            } //TODO not in pos else
        }
        if (entity_changed && former_entity != null) {
            former_entity.onTouchEnd()
        }
        line.build(pos, entity_touched ? entity : null);
    },
    // onTouchCancle(event) {

    // },



    //对象池
    _initPools() {
        this.station_pool = new cc.NodePool("MetroStation") // station对象池
        this.line_pool = new cc.NodePool("MetroLine") // Line 对象池
        this.exit_pool = new cc.NodePool("MetroExit")

        for (let i = 0; i < Metro.station_pool_size; i++) {
            var station = cc.instantiate(this.station_prefab);
            station.getComponent("MetroStation").init()
            this.station_pool.put(station);
        }

        for (let i = 0; i < Metro.line_pool_size; i++) { //最大站点数 需要再定
            let line = cc.instantiate(this.line_prefab);
            this.line_pool.put(line)
        }

        for (let i = 0; i < Metro.exit_pool_size; i++) {
            let exit = cc.instantiate(this.exit_prefab)
            exit.getComponent("MetroExit").init()
            this.exit_pool.put(exit)
        }
    },
    // 地铁网格布局
    _initCells() { // 初始化 所有的单元格
        var size = this.node.getContentSize();
        this.width = size.width;
        this.height = size.height;
        this.cellwidth = size.width / this.layoutx;
        this.cellheight = size.height / this.layouty;
        // 生成 0x *****11111 1 表示有效位置 0x1 >>> 0 表示 生成无符号整数 便于 调试
        // able_mask 用于快速检查 是否有空位
        this.row_able_mask = ((0x1 >>> 0) << (this.layouty + 1)) - 1
        this.col_able_mask = ((0x1 >>> 0) << (this.layoutx + 1)) - 1
            // 位为1 代表可用
        this.cell_masks = { // 代表当前的 cell 使用情况的 mask
                row_mask: 0xffffffff, // 主行数组
                col_mask: []
            } // 存储 各个cell  cell为对应的 station
        this.cells = [] // 用于存储 场景中的 所有的station 的信息 使用分区模式，这样可以快速获得毗邻信息

        for (let i = 0; i < this.layoutx; i++) {
            this.cell_masks.col_mask.push(0xffffffff);
        }
        for (let i = 0; i < this.layoutx; i++) {
            let row = []
            let x = i * this.cellwidth + 0.5 * this.cellwidth;
            for (let j = 0; j < this.layoutx; j++) {
                row.push({ // x, y 指代的是中间位置
                    x: x,
                    y: j * this.cellheight + 0.5 * this.cellheight,
                    entity: null,
                })
            }
            this.cells.push(row)
        }
    },
    getCellIndex(pos) { // 通过 坐标 posx posy 来获取到 cellindex
        pos = this.node.convertToNodeSpaceAR(pos) // 转换到局部坐标
        let x = Math.floor(pos.x / this.cellwidth)
        let y = Math.floor(pos.y / this.cellheight)
        if (this._isValid(x, y))
            return [x, y]
        else
            return null // 没有不在范围内 
    },
    _randomGetFreeCell() { //随机获取一个空白位置
        let rowbits = this.row_able_mask & this.cell_masks.row_mask
        if (rowbits == 0) { // 无空位
            return null;
        }
        let randy = Math.floor(Math.random() * this.layouty);
        let celly = randy
        while ((rowbits & (0x1 << celly)) == 0) {
            celly--;
            if (celly == -1 && randy != this.layouty - 1) {
                celly = this.layouty - 1;
            }
        }
        let randx = Math.floor(Math.random() * this.layoutx)
        let cellx = randx
        while ((this.cell_masks.col_mask[celly] & (0x1 << cellx)) == 0) {
            cellx--;
            if (cellx == -1 && randx != this.layoutx - 1) {
                cellx = this.layoutx - 1;
            }
        }
        return [cellx, celly] //  返回一个
    },
    _randGetFreeCellByPtn(pattern, pattern_info) {

    },
    isFree(x, y) {
        return this.cells[x][y].entity == null;
    },
    getAdjancents(pos) {
        let cellindex = this.getCellIndex(pos)
        let entity = this.cells[cellindex[0]][cellindex[1]].entity
        if (entity != null && entity.isIn(pos)) { // 如果终点在 某个实体内 则直接将全部的乘客送到该站内即可
            return entity
        }
        let entities = [];
        entities.length = 9
        let not_null = false
        for (let i = -1; i <= 1; i++) { // 检查周边的九宫格  
            let x = cellindex[0] + i
            for (let j = -1; j <= 1; j++) {
                let y = cellindex[1] + j
                if (this._isValid(x, y) && !this.isFree(x, y)) {
                    entities[(i + 1) * 3 + j + 1] = this.cells[x][y].entity
                    not_null = true
                }
            }
        }
        return not_null ? entities : null
    },
    _isValid(cellindex_or_x, y) { // 检查
        if (y != null) {
            var x = cellindex_or_x
        } else {
            var x = cellindex_or_x[0]
            y = cellindex_or_x[1]
        }
        return ((x >= 0 && x < this.cells[0].length) && (y < this.cells.length && y >= 0))
    },
    getOccupiedCells() {
        return this._occupied_cells
    },
    getExitCells() {
        return this._exits
    },


    // Entity 生成
    randomGenStation(station_info) { // 随机生成一个 站点 并将其 放入到 cells 数组进行监视        
        let cellindex = this._randomGetFreeCell()
        if (cellindex == null) throw "没有空余空间"; //生成失败
        this.genStation(cellindex[0], cellindex[1], station_info)
    },
    randomGenExit() {
        let cellindex = this._randomGetFreeCell()
        return this.genExit(cellindex[0], cellindex[1])
    },
    randGenStatOfPattern(station_infos, pattern, pattern_info) {
        let cells = this.cells
        let mask = null
        let randomRange = [] // 随机区域的取值范围，
        for (let i = 0; i < this.layouty; i++) {
            randomRange.push(i)
        }
        while (true) { // 随机生成
            if (randomRange.length == 0) return false
            let i = randomRange[Math.floor(Math.random() * randomRange.length)]
            randomRange.remove(i)
            let start_j = Math.floor(Math.random() * this.layoutx)
            let j = start_j
            do {
                mask = pattern(pattern_info, i, j)
                    // 如果为空 则说明位置不合法
                if (mask != null && this._checkPattern(mask)) { // 可行
                    this.genStationByPattern(mask, station_infos)
                    return true // 成功
                }
                j = j == this.layoutx - 1 ? 0 : j + 1
            } while (j != start_j);
        }
    },
    genStationByPattern(pattern_mask, station_infos) { //不可不检查 mask 直接调用
        let cur_num = 0
        for (let i = 0; i < this.cell_masks.col_mask.length; i++) {
            let cur_x = 0
            while ((cur_x = Math.getMaxBit(pattern_mask[i])) != -1) {
                pattern_mask[i] -= 1 << cur_x
                this.genStation(cur_x, i, station_infos[cur_num++])
            }
        }
    },
    _checkPattern(pattern_mask) { // 检查 对应的 pattern 在指定位置是否可用
        var sum = 0
        let tar_sum = 0
        for (let i = 0; i < this.cell_masks.col_mask.length; i++) {
            let and_result = this.cell_masks.col_mask[i] & pattern_mask[i]
            sum += and_result
            tar_sum += pattern_mask[i]
        }
        if (tar_sum != sum) { // 不等，说明重合部位有被占用的cell
            return false
        }
        return true
    },

    genStation(x, y, station_info) { // 生成站点
        if (this.isFree(x, y) == false) throw "已有站点"
            //TODO 解决超过池上限
        if (this.station_pool.size == 0) throw "对象池没有空余"; // 没有空位
        let stationRadius = Metro.station_size;
        let maxRadius = Math.min(this.cellheight, this.cellwidth);
        let scale = (0.5 + Math.random() * 0.5) * maxRadius / stationRadius;
        let scaledRadius = stationRadius * scale;
        let xrange = (this.cellwidth - scaledRadius) / 2;
        let yrange = (this.cellheight - scaledRadius) / 2;
        var station = this.station_pool.get(100, station_info, [x, y], scale);
        let cell = this.cells[x][y]
        station.setScale(scale, scale)
        station.setPosition(cell.x + (xrange * (1 - 2 * Math.random())), cell.y + (yrange * (1 - 2 * Math.random())));
        station.setParent(this.station_root);
        this.occupyCell(x, y, station)
    },
    vanishStation(station, is_exit) {
        this.station_pool.put(station.node)
        station.node.targetOff(this)
        let x = station.cellindex[0]
        let y = station.cellindex[1]
        this.releaseCell(x, y, is_exit)
    },
    genExit(x, y) { //生成出口站
        if (this.isFree(x, y) == false) throw "已有实体"
            //TODO 解决超过池上限
        if (this.exit_pool.size == 0) throw "出口对象池没有空余"; // 没有空位
        let stationRadius = Metro.station_size;
        let maxRadius = Math.min(this.cellheight, this.cellwidth);
        let scale = (0.5 + Math.random() * 0.5) * maxRadius / stationRadius;
        let scaledRadius = stationRadius * scale;
        let xrange = (this.cellwidth - scaledRadius) / 2;
        let yrange = (this.cellheight - scaledRadius) / 2;

        var exit = this.exit_pool.get([x, y], scale);
        let cell = this.cells[x][y]
        exit.setScale(scale, scale)
        exit.setPosition(cell.x + (xrange * (1 - 2 * Math.random())), cell.y + (yrange * (1 - 2 * Math.random())));
        exit.setParent(this.station_root);
        this.occupyCell(x, y, exit, true)
    },
    occupyCell(x, y, entity, is_exit = false) {
        this.cell_masks.col_mask[y] &= ~(1 << x)
        if (this.cell_masks.col_mask[y] & this.col_able_mask == 0) {
            this.cell_masks.row_mask &= ~(1 << y)
        }
        let cell = this.cells[x][y]
        if (!is_exit)
            this._occupied_cells.push(cell)
        else
            this._exits.push(cell)

        cell.entity = entity.getComponent("MetroEntity");
    },
    releaseCell(x, y, is_exit = false) {
        if (this.cell_masks.col_mask[y] & this.col_able_mask == 0) {
            this.cell_masks.row_mask |= (1 << y)
        }
        this.cell_masks.col_mask[y] |= (1 << x)
        let cell = this.cells[x][y]

        if (!is_exit)
            this._occupied_cells.splice(this._occupied_cells.indexOf(cell), 1)
        else
            this._exits.splice(this._occupied_cells.indexOf(cell), 1)
        cell.entity = null
    },
    isStationExist(station_data) { //检查对应的站点 是否已经被生成
        let id = station_data.station_id
        for (let i = 0; i < this._occupied_cells.length; i++) {
            if (this._occupied_cells[i].station_id == id)
                return this._occupied_cells[i]
        }
        return null
    },

    //entity 交互
    addScore(score) { // 分数的增加
        this.score += score
        if (this.score < this.hardThreashold[0]) {
            this.metroUpdate = this.hardOne
        } else if (this.score < this.hardThreashold[1]) {
            this.metroUpdate = this.hardTwo
        }

    },
    //Line 生成
    genLine() {
        var line = this.line_pool.get(1, 100);
        if (line == null) throw "超过路线上限";
        line.setParent(this.line_root)
        line = line.getComponent("MetroLine")
        this.cur_line = line
        return line
    },
    fadeLine(line) { // Line消去
        //let cellindex = this.getCellIndex(line.car_pos)
        this.line_pool.put(line.node)
    },

    // 上层接口封装
    getCarInstance() {
        return this.gameMng.loadData(window.GB_DataType.CAR_PREFAB, this.gameMng.playerMng.car_selected)
    },
    getEffect(id, idx) {
        return this.gameMng.dataMng.getEffect(id, idx)
    },
    exit(){
        
    }
    // 私有幫助函數
})