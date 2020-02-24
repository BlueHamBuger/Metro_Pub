var MetroManager = null
var random = Math.random
var LevelController = cc.Class({ //
    name: "LevelController",
    statics: {
        Settings: {
            level1: {
                level_id: 0,
                max_stations: 10,
                spawnning_interval: 3000, // 两波生成之间的间隔
                spawnning_interval_var: 1000, //浮动
                line_rate: 1, // 生成某个 真实连续地铁路线的概率
                num_std: 4, // 每波生成的标准数量
                num_var: 2, // 生成数量的浮动大小
                crowded_factor_std: 1.5, // 人数增长率
                crowded_factor_var: 0.5, // 增长的 变化区间
                pop_limit_std: 100, // 人数增长率
                pop_limit_var: 20, // 增长的 变化区间
                fastigium_std: 2, // 高峰期的次数
                fastigium_var: 1,
                fastigium_inverval: 5, // 高峰期的来临 的间隔
                fastigium_inverval_var: 1, // 高峰期的来临 的间隔的变化
                exit_num: 2 // 出口数量  
                    //updateFunc: this.levelOne
            },
            level2: {
                level_id: 1,
                max_stations: 25,
            },
        }
    },
    __ctor__(metroMng) {
        this.metroMng = metroMng
        this.metro_patterns = new MetroPatterns(metroMng.layoutx, metroMng.layouty)
        this.hardThreashold = metroMng.hardThreashold
        this._canGen = true // 当前是否可以生成结点
        MetroManager = require("MetroManager")
    },
    update() {
        let score = this.metroMng.score
            // if (score < this.hardThreashold[0]) {
            //     this.levelOne()
            // } else if (score < this.hardThreashold[1]) {
            //     this.metroUpdate = this.hardTwo
            // }'
            //this.levelTest()
        this.levelOne()
    },
    levelTest() { //TEST 
        let occupied_cells = this.metroMng.getOccupiedCells()
        let metroMng = this.metroMng
        if (occupied_cells.length == 0) {
            var metro_patterns = new MetroPatterns(metroMng.layoutx, metroMng.layouty)
            let pattern_mask = metro_patterns.patterns.LShape([3, 4], metroMng.layoutx / 2, metroMng.layouty / 2)
            if (metroMng._checkPattern(pattern_mask)) {
                metroMng.genStationByPattern(pattern_mask)
            }
            let cellindex = metroMng._randomGetFreeCell()
            metroMng.genExit(cellindex[0], cellindex[1])
        }
        // 飞地站点生成（抛弃）
        // for (let i = 0; i < generate_num; i++) {
        //     let station_data = this._randomGetStataion()
        //     if (this.metroMng.isStationExist(station_data) != null) { // 该站点已存在 则要换一个其它的
        //         i--;
        //         continue
        //     }
        //     station_data.color = cc.Color.BLUE
        //     station_data.population_limit = 100
        //     station_data.crowdFactor = 1
        //     this.metroMng.randomGenStation(station_data)
        // }
    },
    levelOne() {
        let setting = LevelController.Settings.level1 //TODO 提取 settings
        let occupied_cells = this.metroMng.getOccupiedCells()
        let exit_cells = this.metroMng.getExitCells()
            // 判断个数
        if (exit_cells.length < setting.exit_num) { // 出口数量不足 , 则 生成出口
            this.metroMng.randomGenExit()
        }
        if (occupied_cells.length >= setting.max_stations) { // 个数太多
            //console.log(occupied_cells.length);
        } else if (this._canGen) {
            this._canGen = false
            let generate_num = Math.getRandom(setting.num_std, setting.num_var, true)
                // 生成连续的特定 样式的站点
            let city = this._randomGetCity()
            let line = this._randomGetLine(city)
            let length = line.station.length
            let start_idx = Math.floor(random() * length)
            if (start_idx + generate_num >= length) { //超过范围
                start_idx = length - generate_num
            }
            let end_i = -1
            let upbound = start_idx + generate_num
            for (let i = start_idx; i < upbound; i++) {
                if (line.station[i].exist == false && line.station[i].for_cell != null) {
                    if ((line.station[i + 1] != null && line.station[i + 1].exist == true) ||
                        (line.station[i - 1] != null && line.station[i - 1].exist == true)) {
                        let cellindex = line.station[i].for_cell
                        let station_data = this._packStationData(line.station[i], city, line, setting)
                        this.metroMng.genStation(cellindex[0], cellindex[1], station_data)
                    } else {
                        upbound = upbound > line.station.length ? line.station.length : upbound + 1 // 增加推进范围 尽量保持生成数量不变
                    }
                } else {
                    if (end_i == -1) {
                        start_idx = end_i = i
                    } else if (i != end_i + 1) // 非连续区间
                        break
                    else
                        end_i++
                }
            }
            if (end_i != -1) {
                let station_infos = line.station.slice(start_idx, end_i)
                console.log(station_infos);
                let station_datas = []
                for (let i = 0; i < station_infos.length; i++) {
                    station_datas.push(this._packStationData(station_infos[i], city, line, setting))
                }
                let patterns = Object.keys(this.metro_patterns.patterns)
                let pattern = this.metro_patterns.patterns[patterns[Math.floor(random() * patterns.length)]]
                this.metroMng.randGenStatOfPattern(station_datas, pattern, station_datas.length)
            }
            let interval = setting.spawnning_interval + (random() - 0.5) * 2 * setting.spawnning_interval_var
            setTimeout(() => { this._canGen = true }, interval)
        }
    },
    levelTwo() {
        let occupied_cells = this.metroMng.getOccupiedCells()
    },
    // 私有
    _randomGetCity() {
        let city_idx = Math.floor(random() * this.metroMng.station_datas.length) // 随机获取一个城市
        return this.metroMng.station_datas[city_idx]
    },
    _randomGetLine(city) {
        if (city == null) {
            city = this._randomGetCity()
        }
        let line_idx = Math.floor(random() * city.line_sta.length) // 随机获取一个城市
        return city.line_sta[line_idx]
    },
    _randomGetStataion(line) {
        if (line == null) {
            line = this._randomGetLine()
        }
        let station_idx = Math.floor(random() * line.station.length)
        return line.station[station_idx]
    },
    // _getActualIncrement(limit, cur, increment) { // 给与上限和当前值获得实际可用增量
    //     if (cur + increment <= limit) {

    //     }
    // }
    _setCanGen(canGen) {
        this._canGen = canGen
    },
    _getFastigiumPop(limit, crowded_factor) { // 根据 指定的参数来计算 高峰期的人数
        return Math.floor(limit * 0.2 * crowded_factor) // 基础值挤占百分之二十
    },
    _packStationData(station_info, city, line, setting) {
        var station_data = {}
        station_data.info = station_info
        station_data.city = city //TODO 优化存储
        station_data.line = line
        station_data.population_limit = Math.getRandom(setting.pop_limit_std, setting.pop_limit_var, true)
        station_data.crowdFactor = Math.getRandom(setting.crowded_factor_std, setting.crowded_factor_var)
        station_data.fastigium_inverval = Math.getRandom(setting.fastigium_inverval, setting.fastigium_inverval_var)
        station_data.fastigium = Math.getRandom(setting.fastigium_std, setting.fastigium_var)
        station_data.fastigium_pop = this._getFastigiumPop(station_data.population_limit, station_data.crowdFactor)
        return station_data
    }
})
var MetroPatterns = function(row_count, col_count) { // 站点的组织模式
    this.masks = []
    this.masks.length = row_count
    this.patterns = {
        Horizontal: (pattern_info, y, x) => {
            if (x + pattern_info > row_count) { // 超过边界
                return null
            }
            this._resetMask()
            let rand = Math.floor(random() * (1 << 31))
            let check_bit = 3 >>> 0
            this.masks[y] |= 1 << x
            for (let i = 1; i < pattern_info; i++) {
                let bias_dir = rand & check_bit
                let row = y
                if (bias_dir == 0 && y - 1 != -1) {
                    row = y - 1
                } else if (bias_dir == 1 && y + 1 < row_count) {
                    row = y + 1
                }
                this.masks[row] |= 1 << x + i
                rand >>= 1
            }
            //this.masks[y] = (1 << (x + pattern_info)) - (1 << x)
            return this.masks
        },
        Vertical: (pattern_info, y, x) => {
            if (y - pattern_info + 1 < 0) {
                return null
            }
            this._resetMask()
            let rand = Math.floor(random() * (1 << 31))
            let check_bit = 3 >>> 0
            this.masks[y] |= 1 << x
            for (let i = y - 1; i > y - pattern_info; i--) {
                let bias_dir = rand & check_bit
                let col = x
                if (bias_dir == 0 && x - 1 != -1) {
                    col = x - 1
                } else if (bias_dir == 1 && x + 1 < col_count) {
                    col = x + 1
                }
                this.masks[i] |= 1 << col
                rand >>= 1
            }
            return this.masks
        },
        // ZShape: (pattern_info, x, y) => { //pattern_info 为 z 所处的正方形的边长
        //     if (pattern_info + x > row_count || y - pattern_info + 1 < 0) {
        //         return null
        //     }
        //     this._resetMask()
        //     this.masks[y] = this.masks[y - pattern_info + 1] = (1 << (x + pattern_info)) - (1 << x)
        //     for (let i = 1; i < pattern_info - 1; i++) {
        //         this.masks[y - i] = 1 << x + pattern_info - i - 1
        //     }
        //     return this.masks
        // },
        LShape: (pattern_info, y, x) => { // pattern_info 分别指示 竖方向和 横方向的 长度
            if (pattern_info.length == null) { // 随机生成 此时pattern_info 指代的是结点的个数
                let num = pattern_info
                pattern_info = []
                pattern_info.length = 2
                    //let max_deltax = row_count - x
                let max_deltay = y + 1
                let rand_num = Math.floor(random() * (num - 1)) + 1
                pattern_info[1] = rand_num > max_deltay ? max_deltay : rand_num
                num -= pattern_info[1] - 1
                if (num + x > row_count) num = row_count - x
                pattern_info[0] = num
            } else if (pattern_info[1] + x > row_count || y - pattern_info[0] + 1 < 0) {
                return null
            }
            this._resetMask()
            let w = pattern_info[0]
            let h = pattern_info[1]
            this.masks[y - h + 1] = (1 << (x + w)) - (1 << x)
            for (let i = 0; i < h - 1; i++) {
                this.masks[y - i] = 1 << x
            }
            return this.masks
        }
    }

    this._resetMask = () => {
        for (let i = 0; i < row_count; i++) {
            this.masks[i] = 0
        }
    }
}