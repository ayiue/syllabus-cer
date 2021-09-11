export const SEMESTER={
    name: '2021-2022 第一学期',
    id: '2021-2022 sem1', // checked before importing
    begin_date: new Date(2021,9-1,13, 0,0,0,0),
    weeks: 16,
    exclude_dates: [
        new Date(2021,9-1,21, 0,0,0,0), // 中秋节
        new Date(2021,10-1,1, 0,0,0,0), // 国庆节
        new Date(2021,10-1,2, 0,0,0,0),
        new Date(2021,10-1,3, 0,0,0,0),
        new Date(2021,10-1,4, 0,0,0,0),
        new Date(2021,10-1,5, 0,0,0,0),
        new Date(2021,10-1,6, 0,0,0,0),
        new Date(2021,10-1,7, 0,0,0,0),
        new Date(2021,10-1,16, 0,0,0,0), // 运动会
    ]
};

export const DATA_VER='data_v3';