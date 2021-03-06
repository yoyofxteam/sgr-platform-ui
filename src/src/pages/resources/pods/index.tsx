
import { PageContainer } from '@ant-design/pro-layout';
import ProTable, { ProColumns, ActionType } from '@ant-design/pro-table';
import ProForm, { ModalForm, ProFormInstance } from '@ant-design/pro-form';
import { history, Link,useModel } from 'umi';
import { PodItem, ContainerItem, podLogsRequest } from './data';
import { Tabs, Button, Space, Tooltip, Tag, Modal, InputNumber, message, Popconfirm, Select, Switch, Input, notification, Radio } from 'antd'
import { getPodList, getNamespaceList, setReplicasByDeployId, GetDeploymentFormInfo, destroyPod, getPodLogs, getYaml } from './service'
import React, { useState, useRef, useEffect } from 'react';
import { CloudUploadOutlined,ExpandAltOutlined,LoadingOutlined, ReloadOutlined ,SearchOutlined } from '@ant-design/icons';
import moment from 'moment'; 
import 'codemirror/lib/codemirror.js'
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/yaml/yaml';
import './monokai-bright.css'
import { UnControlled as CodeMirror } from 'react-codemirror2';
import EventListComponent from './events';
import WebTerminal from './terminal';
import ExecDeployment from '@/pages/applications/execDeployment';


const { TabPane } = Tabs;
const { Option } = Select;

const Pods: React.FC = (props) => {
    const { initialState } = useModel('@@initialState');
    const currentUser =  initialState?.currentUser

    const [time, setTime] = useState(() => Date.now());
    const [polling, setPolling] = useState<number | undefined>(undefined);
    const [visableScaleModal, setVisableScaleModal] = useState<boolean>(false);
    const formScaleModalRef = useRef<ProFormInstance>();
    const [visibleTerminal, setVisibleTerminal] = useState(false);
    const [visibleWebConsole, setVisibleWebConsole] = useState(false);

    const [podListState, handePodListState] = useState<PodItem[]>([]);
    const [containerListState, handeContainerListState] = useState<ContainerItem[]>([]);
    const [selectedNamespace, setSelectedNamespace] = useState<string | undefined>(undefined);
    const [selectedPodName, setSelectedPodName] = useState<string | undefined>(undefined);
    const [selectedContainerName, setSelectedContainerName] = useState<string | undefined>(undefined);
    const [selectedLines, setSelectedLines] = useState<number>(100);
    const [autoLogs, setAutoLogs] = useState<boolean>(false)
    const [logContent, setLogContent] = useState<string[]>([]);
    const [yamlContent, setyamlContent] = useState<string>("");
    const [execFormVisible, setExecFormVisible] = useState(false);
    const [dpId, stepDpId] = useState<number>(0);
    var text1: any = undefined;


    var deploymentInfo = history.location.state
    var deployId = history.location.query?.did
    var namespace = history.location.query?.ns
    var appName = history.location.query?.app
    var clusterId = history.location.query?.cid
    var node = history.location.query?.node
    var did = 0
    if (deployId) {
        did = Number(deployId)
    }
    if (clusterId == undefined && (node == undefined || appName == undefined)) {
        history.goBack()
    }

    function bindYaml() {
        let res = getYaml(deployId)
        res.then((x) => {
            if (x?.success) {
                setyamlContent(x.data)
            } else {
                notification.open({
                    message: '??????Pod Yaml??????',
                    description: x?.message,
                });
            }
        })
    }

    const podColumns: ProColumns<PodItem>[] = [
        {
            title: '????????????',
            dataIndex: 'name',
            search: false,
            render: (dom, _) => {
                return <span style={{ color: 'blue' }}>{dom}</span>
            }
        },
        {
            title: '??????',
            dataIndex: 'status',
            search: false,
            render: (dom, row) => {
                if (row.status == 'Running') {
                    return <span style={{ color: 'green' }}>{dom}</span>
                }
                return <span style={{ color: 'red' }}>{dom}</span>
            }
        },
        {
            title: '??????IP',
            dataIndex: 'ip',
            search: false,
            render: (dom, _) => {
                return <span style={{ color: 'blue' }}>{dom}</span>
            }
        },
        {
            title: '??????????????????IP',
            dataIndex: 'hostIP',
            search: false,
        },
        {
            title: '????????????',
            dataIndex: 'namespace',
            valueType: 'select',
            request: async () => {
                var namespaces = [{ label: '??????', value: '' }]
                var ns = await getNamespaceList(String(clusterId))
                namespaces.push(...ns)
                return namespaces
            }
        },
        {
            title: '????????????',
            dataIndex: 'restarts',
            search: false,
            render: (dom, _) => {
                return <span>{dom} ???</span>
            }
        },
        {
            title: '?????????',
            search: false,
            render: (_, row) => {
                return <span>{row.containers.length}???</span>
            }
        },
        {
            title: '????????????',
            dataIndex: 'startTime',
            search: false,
        },
        {
            title: '??????',
            dataIndex: 'x',
            valueType: 'option',
            render: (_, record) => {
                return [
                    <Popconfirm key="confirm_delete" title="?????????????????????????"
                        onConfirm={async () => {
                            const resp = await destroyPod({
                                clusterId: Number(clusterId),
                                namespace: record.namespace,
                                podName: record.name
                            })
                            if (resp.success) {
                                message.success("??????????????????")
                                setPolling(1000)
                            } else { message.error("??????????????????") }
                        }}>
                        <a key="delete">????????????</a></Popconfirm>,
                    <a key="remote" onClick={()=>{
                        setSelectedPodName(record.name)
                        handeContainerListState(record.containers)
                        setSelectedNamespace(record.namespace)
                        setVisibleWebConsole(true)
                    }}>????????????</a>
                ]
            },
        },

    ]

    const expandedRowRender = (podItem: PodItem) => {
        return (
            <ProTable
                columns={[
                    { title: '????????????', dataIndex: 'name', key: 'name' },
                    { title: '??????ID', dataIndex: 'id', key: 'id' },
                    { title: '???????????????', dataIndex: 'image', key: 'image' },
                    //   { title: 'CPU Request', dataIndex: 'cpuRequest', key: 'cpuRequest' },
                    //   { title: 'CPU Limit', dataIndex: 'cpuLimit', key: 'cpuLimit' },
                    //   { title: '?????? Request', dataIndex: 'memoryRequest', key: 'memoryRequest' },
                    //   { title: '?????? Limit', dataIndex: 'memoryLimit', key: 'memoryLimit' },
                    { title: '????????????', dataIndex: 'restartCount', key: 'restartCount' },
                    {
                        title: '??????', dataIndex: 'status', key: 'status',
                        render: (_, row) => {
                            return [
                                <Tooltip title={row.state} color="geekblue" key="status">
                                    <Space direction="vertical">
                                        <span>Readly:  {row.ready ? <Tag color="geekblue">{String(row.ready)}</Tag> : <Tag color="#f50">String(row.ready)</Tag>}</span>
                                        <span>Started:  {row.started ? <Tag color="geekblue">{String(row.started)}</Tag> : <Tag color="#f50">String(row.started)</Tag>}</span>
                                    </Space>
                                </Tooltip>
                            ]
                        }
                    },
                ]}
                rowKey="id"
                headerTitle={false}
                search={false}
                options={false}
                dataSource={podItem.containers}
                pagination={false}
            />
        );
    };

    console.log(clusterId)
    console.log(node)
    var pageTitle = "Pod ??????     "
    var breadcrumb = [
        { path: '', breadcrumbName: '????????????' },
        { path: '', breadcrumbName: '', }]
    if (appName) {
        breadcrumb[0] = { path: '', breadcrumbName: '????????????' }
        breadcrumb[1] = { path: '', breadcrumbName: 'Pod??????' }
        pageTitle = pageTitle + ' -- ????????????: ' + appName
    } else if (node) {
        breadcrumb[0] = { path: '', breadcrumbName: '????????????' }
        breadcrumb[1] = { path: '', breadcrumbName: '????????????' }

    }

    const bindLogsFunc = async () => {
        const req: podLogsRequest = {
            clusterId: Number(clusterId), namespace: namespace?.toString(),
            podName: selectedPodName, containerName: selectedContainerName, lines: selectedLines
        }
        console.log(req)
        if(!req.podName){
            return 
        }
        var lines = await getPodLogs(req)
        setLogContent(lines)
    }

    useEffect(() => {
        if (selectedPodName && selectedContainerName && namespace) {
            bindLogsFunc()
            var id: NodeJS.Timeout
            if (autoLogs) {
                id = setInterval(bindLogsFunc, 2000)
            }
            return () => { clearInterval(id) }
        }
    }, [selectedPodName, selectedContainerName, selectedLines, autoLogs])

    return (
        <PageContainer title={pageTitle} style={{ background: 'white' }}
            header={{
                breadcrumb: { routes: breadcrumb },
                extra: [<Button key="1" onClick={() => {
                    history.goBack()
                }}>???????????????</Button>,],
            }}
        >
            <Tabs defaultActiveKey="1" size="large" type="line" tabBarStyle={{ background: 'white' }}
                onChange={(e) => {
                    switch(e){
                        case "2":
                            console.log(podListState)
                            if (podListState.length > 0) {
                                handePodListState(podListState)
                                handeContainerListState(podListState[0].containers)
                                setSelectedPodName(podListState[0].name)
                                setSelectedContainerName(podListState[0].containers[0].name)
                            }
                            break;
                        case "4":
                            bindYaml()
                            setAutoLogs(false)
                            break
                        default:
                            setAutoLogs(false)
                    }
                }}>
                <TabPane tab="????????????" key="1" >
                    <ProTable<PodItem>
                        rowKey={record => record.name}
                        columns={podColumns}
                        dateFormatter="string"
                        pagination={{ pageSize: 1000 }}
                        headerTitle={`Pod ?????? - ?????????????????????${moment(time).format('HH:mm:ss')}`}
                        expandable={{ expandedRowRender }}
                        request={async (params, sort) => {
                            params.cid = clusterId
                            if (appName) { params.app = appName } 
                            else { params.node = node }
                            var podsData = await getPodList(params, sort)
                            handePodListState(podsData.data)
                            setTime(Date.now());
                            return podsData
                        }}
                        polling={polling || undefined}
                        toolBarRender={() => [
                            <Button key='button' type="primary" icon={<CloudUploadOutlined />} style={{ display: did > 0 ? 'block' : 'none' }}
                                onClick={() => { setPolling(1000); 
                                    stepDpId(Number(deployId)) 
                                    ;setExecFormVisible(true) }}>????????????</Button>,
                            <Button key='button' type="primary" icon={<ExpandAltOutlined />} style={{ display: did > 0 ? 'block' : 'none' }}
                                onClick={async () => {
                                    const hide = message.loading('????????????????????????...', 0);
                                    const resp = await GetDeploymentFormInfo(did)
                                    var replicas = 1
                                    if (resp.success) {
                                        replicas = resp.data.replicas
                                        deploymentInfo.expected = replicas
                                        setVisableScaleModal(true)
                                        setTimeout(() => {
                                            formScaleModalRef.current?.setFieldsValue({ replicas: replicas })
                                        }, 200)
                                    } else {
                                        message.error('??????????????????,????????????');
                                    }
                                    hide()
                                }}>????????????</Button>,
                            <Popconfirm title="?????????????????????????"
                                onConfirm={async () => {
                                    const resp = await setReplicasByDeployId(did, 0)
                                    setPolling(1000);
                                    if (resp.success) {
                                        message.success('??????????????????');
                                    } else {
                                        message.error('?????????????????????');
                                    }
                                }}> <Button key='button' danger style={{ display: did > 0 ? 'block' : 'none' }}>????????????</Button></Popconfirm>,
                            <Button key="3"
                                onClick={() => { if (polling) { setPolling(undefined); return; } setPolling(2000); }} >
                                {polling ? <LoadingOutlined /> : <ReloadOutlined />}
                                {polling ? '????????????' : '????????????'}
                            </Button>,]}
                    />
                </TabPane>
                <TabPane tab="??????" key="2" disabled={ namespace==undefined?true:false } >
                    <div style={{ marginBottom: 10 }}>
                        <Select value={selectedPodName} bordered autoFocus style={{ width: 320 }} defaultActiveFirstOption
                            options={podListState.map(pod => ({ label: pod.name, value: pod.name }))}
                            onChange={(v, op) => {
                                setSelectedPodName(v)
                                const filter = podListState.filter(item => item.name == v)
                                if (filter.length > 0) {
                                    handeContainerListState(filter[0].containers)
                                    setSelectedContainerName(filter[0].containers[0].name)
                                }
                            }}
                        >
                        </Select>
                        <Select value={selectedContainerName} bordered style={{ width: 320, marginLeft: 5 }}
                            options={containerListState.map(c => ({ label: c.name, value: c.name }))}
                            onSelect={(val) => { setSelectedContainerName(val)  }} > </Select >
                        <Select value={selectedLines} bordered style={{ width: 320, marginLeft: 5 }}
                            onSelect={(value) => { setSelectedLines(value) }}>
                            <Option value={100} >??????100?????????</Option>
                            <Option value={200} >??????200?????????</Option>
                            <Option value={500} >??????500?????????</Option>
                            <Option value={1000}>??????1000?????????</Option>
                        </Select>
                        <Button type="primary" icon={<SearchOutlined />} style={{ marginLeft: 5 }}
                            onClick={() => {  bindLogsFunc() }}  >????????????</Button>
                        <Switch size="default" style={{ marginLeft: 15 }} checkedChildren="??????" unCheckedChildren="??????" checked={autoLogs}
                            onChange={(v) => {
                                setAutoLogs(v)
                            }}
                        />
                    </div>
                    <textarea value={logContent} ref={(text) => { if (text) { text.scrollTop = Number(text?.scrollHeight) } }}
                        rows={selectedLines} readOnly style={{
                            background: 'black', width: '100%', height: 780,
                            border: '1px solid rgb(221,221,221)', fontSize: '15px', color: 'whitesmoke'
                        }}>
                    </textarea>
                </TabPane>
                <TabPane tab="??????" key="3"  disabled={ namespace==undefined?true:false } >
                    <EventListComponent clusterId={ Number(clusterId) } deployment={ appName?.toString() } namespace={ namespace?.toString() } ></EventListComponent>
                </TabPane>
                <TabPane tab="YAML" key="4"  disabled={ namespace==undefined?true:false } >
                    <div style={{  height: 890 }}>
                    <CodeMirror
                        editorDidMount={editor => { editor.setSize('auto','780') }}
                        value={yamlContent}
                        options={{ mode:{name:'text/yaml'}, theme: 'monokai-bright',
                            readOnly: true, lineNumbers:true, }} >
                    </CodeMirror>
                    </div>
                </TabPane>
            </Tabs>

            <ModalForm<{ replicas: number; }>
                title="????????????"
                formRef={formScaleModalRef}
                width={350}
                visible={visableScaleModal}
                onVisibleChange={setVisableScaleModal}
                onFinish={async (values) => {
                    if (deploymentInfo.expected == values.replicas) {
                        message.warning('???????????????');
                    } else {
                        const resp = await setReplicasByDeployId(did, values.replicas)
                        setPolling(1000);
                        if (resp.success) {
                            message.success('??????????????????');
                        } else {
                            message.error('?????????????????????');
                        }
                    }
                    return true
                }}
                autoFocusFirstInput
                layout="horizontal"
                modalProps={{ forceRender: true, destroyOnClose: true, centered: true }} >
                <ProForm.Item label="????????????" name='replicas' rules={[{ required: true, message: "?????????????????????" }]}>
                    <InputNumber autoFocus={true} min={1} max={20}></InputNumber>
                </ProForm.Item>
            </ModalForm>

            <Modal title="????????????" centered visible={visibleWebConsole} width={600}  destroyOnClose footer={[]} onCancel={()=>{ setVisibleWebConsole(false) } } >
                <p>?????????????????? {containerListState?.length} ????????? </p>
                <ProTable  dataSource={containerListState} 
                     columns={[ { title: '????????????', dataIndex: 'name', key: 'name' },
                                { title: '??????', dataIndex: 'status', key: 'status', render: (_, row) => { return [ <Tooltip title={row.state} color="geekblue" key="status">
                                    {row.started ? <Tag color="geekblue">{String(row.started)}</Tag> : <Tag color="#f50">String(row.started)</Tag>}
                                </Tooltip>  ] } },
                                { title: '??????', render:(_,row)=>{
                                    return (<a onClick={()=>{ 
                                        setSelectedContainerName(row.name)
                                        setVisibleTerminal(true)
                                    }}>??????</a>)
                                } }
                              ]}
                     rowKey="id" headerTitle={false} search={false} options={false} pagination={false} />
                 <p>Shell??????????????????????????????????????????????????????????????????</p>
                 <p><Radio checked>/bin/bash</Radio></p>
            </Modal>

            <Modal title={`Web Console for SGR --  Pod:${selectedPodName}, Container:${selectedContainerName}` } centered visible={visibleTerminal} width={1920}  destroyOnClose footer={[]} onCancel={()=>{ setVisibleTerminal(false) } } >
                <WebTerminal tenantId={ Number(currentUser?.group)} clusterId={Number(clusterId)} 
                        namespace={selectedNamespace} pod_Name={selectedPodName} container_Name={selectedContainerName}></WebTerminal>
            </Modal>
            <ExecDeployment visibleFunc={[execFormVisible, setExecFormVisible]}deploymentId={dpId} ></ExecDeployment>
        </PageContainer>)

}

export default Pods