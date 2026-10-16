export const vedaImportCategories = [
    { slug: 'nizkovoltnye-pch-i-upp', name: 'Низковольтные ПЧ и УПП', parent: null },
    { slug: 'preobrazovateli-chastoty-veda-vfd', name: 'Преобразователи частоты VEDA VFD', parent: 'nizkovoltnye-pch-i-upp' },
    { slug: 'modulnye-resheniya-vf-400', name: 'Модульные решения VF-400', parent: 'nizkovoltnye-pch-i-upp' },
    { slug: 'paneli-operatora-veda', name: 'Панели оператора VEDA', parent: 'nizkovoltnye-pch-i-upp' },
    { slug: 'platy-rasshireniya-veda', name: 'Платы расширения VEDA', parent: 'nizkovoltnye-pch-i-upp' },
];

export const vedaImportProductTypes = [
    { code: 'FREQUENCY_CONVERTER', name: 'Преобразователь частоты' },
    { code: 'INVERTER_MODULE', name: 'Инверторный модуль' },
    { code: 'OPERATOR_PANEL', name: 'Панель оператора' },
    { code: 'EXPANSION_BOARD', name: 'Плата расширения' },
];

export const vedaImportPanelSkus = ['PBN00001', 'PBN00002'];

// Names are matched exactly; unknown or ambiguous source values stay in specs.
export const vedaImportAttributes = [
    { code: 'rated_current_a', name: 'Номинальный ток', unit: 'А', dataType: 'NUMBER', source: 'Номинальный выходной ток, А' },
    { code: 'rated_power_kw', name: 'Выходная мощность', unit: 'кВт', dataType: 'NUMBER', source: 'Выходная мощность, кВт' },
    { code: 'input_voltage_v', name: 'Входное напряжение', unit: 'В', dataType: 'NUMBER', source: 'Входное напряжение, В' },
    { code: 'protection_ip', name: 'Степень защиты', unit: null, dataType: 'TEXT', source: ['Степень защиты', 'Степень защиты корпуса', 'Cтепень защиты корпуса'] },
    { code: 'brake_chopper', name: 'Тормозной ключ', unit: null, dataType: 'TEXT', source: 'Торм.ключ' },
    { code: 'communication_interface', name: 'Интерфейс связи', unit: null, dataType: 'TEXT', source: ['Канал связи', 'Сетевой интерфейс'] },
    { code: 'frame_size', name: 'Типоразмер', unit: null, dataType: 'TEXT', source: 'Типоразмер' },
    { code: 'thermal_loss_w', name: 'Тепловые потери', unit: 'Вт', dataType: 'NUMBER', source: 'Тепловые потери, Вт' },
    { code: 'thermal_loss_kw', name: 'Потери', unit: 'кВт', dataType: 'NUMBER', source: 'Потери, кВт' },
    { code: 'air_flow_m3_h', name: 'Воздушный поток', unit: 'м³/ч', dataType: 'NUMBER', source: 'Воздуш. Поток, м3/ч' },
];

export const vedaImportLoadModes = [
    { mode: 'HEAVY_DUTY', power: 'Мощность тяжёлая перегрузка , кВт', current: 'Ток тяжёлая перегрузка Iac, А' },
    { mode: 'LIGHT_DUTY', power: 'Мощность лёгкая перегрузка, кВт', current: 'Ток лёгкая перегрузка Iac, А' },
    { mode: 'NO_OVERLOAD', power: 'Мощность без перегрузки, кВт', current: 'Ток без перегрузки Iac, А' },
];
