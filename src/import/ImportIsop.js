import React, {Component, PureComponent} from 'react';
import {get_json} from '../infrastructure/functions';
import {PKUHELPER_ROOT, ISOP_APPKEY, ISOP_APPCODE} from '../infrastructure/const';
import md5 from 'md5';
import {Spin, Affix, PageHeader, Button, Icon, Alert, Checkbox} from 'antd';
import {ROUTES} from '../routes';

import './ImportIsop.css';
import {CourseList} from './CourseList';
import {LoginPopup} from '../infrastructure/widgets';

export class ImportIsop extends Component {
    constructor(props) {
        super(props);

        this.DESC_DISP_NAMES=['班号','学分'];
        this.DESC_KEY={classid:'班号',credits:'学分'};

        this.isop_resp=null;
        this.state={
            loading_status: 'init',
            error: null,
            courses: [],
            skipped_courses: [],
            desc_checked: ['班号'],
        };
    }

    componentDidMount() {
        this.do_load();
    }

    on_got_token(token) {
        localStorage['TOKEN']=token;
        this.do_load();
    }

    parse_isop_courselist() {
        let li=this.isop_resp;
        console.log(li);
        let cos=[];
        li.forEach((co,idx)=>{
            let name=co.kcmc;

            let desc_items=[];
            if(this.state.desc_checked.indexOf(this.DESC_KEY.classid)!==-1)
                desc_items.push(co.jxbh+'班');
            if(this.state.desc_checked.indexOf(this.DESC_KEY.credits)!==-1)
                desc_items.push(parseFloat(co.xf).toFixed(1).replace(/\.0$/,'')+'学分');

            let desc=desc_items.join('，');

            cos.push(co.jsap
                .map((info)=>({
                    course_name: name,
                    begin_week: parseInt(info.qsz),
                    end_week: parseInt(info.jsz),
                    every: {'每周': 'all', '单周': 'odd', '双周': 'even'}[info.dsz],
                    weekday: parseInt(info.xq),
                    begin_time: parseInt(info.kssj),
                    end_time: parseInt(info.jssj),
                    classroom: info.skjs,
                    desc: desc,
                    _skip_idx: idx,
                }))
                .filter((co)=>!isNaN(co.begin_time) && !isNaN(co.begin_week))
            );
        });

        return [].concat.apply([],cos);
    }

    do_load() {
        if(this.state.loading_status==='loading') return;
        this.setState({
            loading_status: 'loading',
        },()=>{
            let user_token=localStorage['TOKEN'];
            if(!user_token) {
                this.setState({
                    loading_status: 'login_required',
                });
                return;
            }
            fetch(PKUHELPER_ROOT+'api_xmcp/isop/coursetableroom?user_token='+encodeURIComponent(user_token))
                .then(get_json)
                .then((json)=>{
                    if(json.success===false) { // sb isop do not result `success` when success
                        if(json.errCode && ['E01','E02','E03'].indexOf(json.errCode)!==-1) { // need re-login
                            this.setState({
                                loading_status: 'login_required',
                            });
                            return;
                        }
                        else
                            throw new Error(JSON.stringify(json));
                    }

                    if((!json.list || json.list.length===0) && !json.check) {
                        throw new Error('ISOP没有返回课表信息');
                    }

                    this.isop_resp=json.list;
                    this.setState({
                        loading_status: 'done',
                        courses: this.parse_isop_courselist(),
                        skipped_courses: [],
                    });
                })
                .catch((e)=>{
                    this.setState({
                        loading_status: 'failed',
                        error: ''+e,
                    });
                });
        });
    }

    on_desc_change(li) {
        this.setState({
            desc_checked: li,
        },()=>{
            this.setState({
                courses: this.parse_isop_courselist(),
            })
        });
    }

    toggle_course(name) {
        this.setState((prevState)=>{
            let skipped=prevState.skipped_courses.slice();

            if(skipped.indexOf(name)!==-1) // remove
                skipped=skipped.filter((n)=>n!==name);
            else // add
                skipped=skipped.concat([name]);

            return {
                skipped_courses: skipped,
            };
        });
    }

    do_import() {
        let imported_courses=this.state.courses
            .filter((co)=>this.state.skipped_courses.indexOf(co._skip_idx)===-1)
            .map((co)=>{
                let {_skip_idx, ...other}=co;
                return other;
            });
        this.props.setCourses(this.props.courses.concat(imported_courses));
        this.props.navigate(ROUTES.edit);
    }

    render_content() {
        if(this.state.loading_status==='loading')
            return (
                <div className="loading-frame">
                    <Spin /> 加载中……
                </div>
            );
        else if(this.state.loading_status==='failed')
            return (
                <div className="loading-frame">
                    <Alert message={this.state.error} type="error" showIcon />
                    <br />
                    <p>
                        <Button type="primary" onClick={this.do_load.bind(this)}>重新加载</Button>
                        &nbsp;
                        <Button onClick={()=>{this.props.navigate(ROUTES.import_elective);}}>从选课系统导入课表</Button>
                    </p>
                </div>
            );
        else if(this.state.loading_status==='done')
            return (
                <div>
                    <Alert message={<span>
                        如果数据错误，说明本学期课表尚未录入，
                        请 <a onClick={()=>{this.props.navigate(ROUTES.import_elective);}}>从选课系统导入课表</a>
                    </span>} type="info" showIcon />
                    <br />
                    <div>
                        备注：
                        <Checkbox.Group
                            options={this.DESC_DISP_NAMES}
                            value={this.state.desc_checked}
                            onChange={this.on_desc_change.bind(this)}
                        />
                    </div>
                    <br />
                    <CourseList
                        courses={this.state.courses}
                        skipped_courses={this.state.skipped_courses}
                        toggle_course={this.toggle_course.bind(this)}
                        do_import={this.do_import.bind(this)}
                    />
                </div>
            );
        else if(this.state.loading_status==='login_required')
            return (
                <div className="loading-frame">
                    授权失效，请&nbsp;
                    <LoginPopup token_callback={this.on_got_token.bind(this)}>{(do_popup)=>(
                        <Button onClick={do_popup} type="primary">输入 PKU Helper 的 token</Button>
                    )}</LoginPopup>
                </div>
            );
        else
            return null;
    }

    render() {
        return (
            <div>
                <Affix offsetTop={0}>
                    <PageHeader title="从教务系统导入课表" onBack={()=>{this.props.navigate(ROUTES.homepage);}} extra={
                        this.props.courses.length>0 && <Button size="small" onClick={()=>{this.props.navigate(ROUTES.edit);}}>
                            编辑器
                        </Button>
                    } />
                </Affix>
                <div className="main-margin">
                    {this.render_content()}
                </div>
            </div>
        )
    }
}