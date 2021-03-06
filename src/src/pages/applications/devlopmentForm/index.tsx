import React, { SetStateAction, useState, Dispatch, useEffect, useRef, } from 'react';
import ProForm, {
    StepsForm,
    ProFormSelect,
    ProFormInstance
} from '@ant-design/pro-form';
import ProCard from '@ant-design/pro-card';
import { Select, Input, Checkbox, Modal, InputNumber, Space, Alert, notification ,Drawer } from 'antd';
import ProFormItem from '@ant-design/pro-form/lib/components/FormItem';
import { BindCluster, BindNameSpace, CreateDeploymnet, CreateDeploymnetLimit, GetDeploymentFormInfo } from './service';
import { DeploymentStep } from './devlopment_data';
import { CloseCircleTwoTone, SmileOutlined } from '@ant-design/icons';

export interface Props {
    visibleFunc: [boolean, Dispatch<SetStateAction<boolean>>],
    appId: any,
    appName: any,
    tableRef: any,
    isEdit: boolean,
    id?: number,
}
function BindNamespaceSelect(clusterId: any, handler: any) {
    let req = BindNameSpace(clusterId)
    req.then(x => {
        if (x.success) {
            console.log(x)
            handler(x.data.map(y => { return { value: y.id, label: y.namespace } }))
        }
    })
}

function BindClusterName(clusterId: number, clusterArr: any, nameHandler: any) {
    clusterArr.forEach((element: { value: number, label: string }) => {
        if (clusterId == element.value) {
            nameHandler(element.label)
        }
    });
}

const DevlopmentForm: React.FC<Props> = (props: Props) => {
    const [namespace, namespcaeHandler] = useState<any>();
    const [cluster, clusterHandler] = useState<any>();
    const [clusterId, clusterIdHandler] = useState<any>();
    const [openScv, openScvHandler] = useState<boolean>(false);
    const [dpStep, dpStepHandler] = useState<DeploymentStep>();
    const [clusterName, clusterNameHandler] = useState<string>("")
    const [deployment, deploymentHandler] = useState<DeploymentStep>()
    const formMapRef = useRef<React.MutableRefObject<ProFormInstance<any> | undefined>[]>([]);
   
    function BindClusterSelect() {
        let req = BindCluster()
        req.then(x => { clusterHandler(x) })
    }

    useEffect(() => {
        BindClusterSelect()
        if (props.isEdit) {
            let req = GetDeploymentFormInfo(props.id)
            req.then(x => {
                if (!x.success) {
                    props.visibleFunc[1](false)
                }
                setTimeout(() => {
                    deploymentHandler(x.data)
                    BindClusterName(x.data.clusterId, cluster, clusterNameHandler)
                    // dpLevelHandler(x.data.level)
                    formMapRef.current.forEach((formInstanceRef) => {
                        BindNamespaceSelect(x.data.clusterId, namespcaeHandler)
                        openScvHandler(x.data.serviceEnable)
                        formInstanceRef.current?.setFieldsValue(x.data)
                    })
                }, 200)
            })
        } else {
            openScvHandler(true)
            formMapRef.current.forEach((formInstanceRef) => {
               
                formInstanceRef.current?.setFieldsValue({  
                    level: 'dev',
                    serviceEnable: 'true',
                    serviceAway: 'ClusterPort',
                    servicePort: '8080' ,
                    replicas: 1,
                    requestCpu: 0.25,
                    requestMemory: 128,
                    limitCpu: 0.25,
                    limitMemory: 256
                })
            })
        }
    }, props.visibleFunc)
    return (

        <ProCard>
            <StepsForm<DeploymentStep>
                formMapRef={formMapRef}
                onFinish={async (value) => {
                    value.id = dpStep?.id;
                    value.appId = props.appId;
                    let res = await CreateDeploymnetLimit(value)
                    if (res.success) {
                        props.visibleFunc[1](false)
                        notification.open({
                            message: res.message,
                            icon: <SmileOutlined style={{ color: '#108ee9' }} />,
                        });
                    }
                    props.tableRef.current?.reload()
                    return res.success
                }}
                stepsFormRender={(dom, submitter) => {
                    return (
                        <Drawer
                            title="????????????"
                            width={600}
                            onClose={() => { props.visibleFunc[1](false) }}
                            visible={props.visibleFunc[0]}
                            footer={submitter}
                            destroyOnClose={true}
                        >
                            {dom}
                        </Drawer>
                    );
                }}
            >
                <StepsForm.StepForm<DeploymentStep>
                    title="????????????"
                    onFinish={async (value) => {
                        value.clusterId = clusterId;
                        value.serviceEnable = openScv;
                        if (props.isEdit) {
                            value.appId = deployment?.appId;
                            value.name = deployment?.name;
                            value.id = props.id;
                        } else {
                            value.appId = parseInt(props.appId);
                            value.clusterId = clusterId;
                            value.name = (`${value.level}-${props.appName}-${clusterName}`).trim();
                        }
                        let res = await CreateDeploymnet(value)
                        if (res.success == false) {
                            notification.open({
                                message: res.message,
                                icon: <CloseCircleTwoTone />,
                            });
                        }
                        dpStepHandler(res.data)
                        return res.success
                    }}
                >
                    <ProForm.Item label="????????????" name='nickname' rules={[{ required: true, message: '?????????????????????' }]}>
                        <Input ></Input>
                    </ProForm.Item>
                    <ProForm.Item label="????????????" name='level'>
                        <Select
                            disabled={props.isEdit}
                            options={[
                                {
                                    value: 'dev',
                                    label: 'dev',
                                },
                                { value: 'test', label: 'test' },
                                { value: 'prod', label: 'prod' },
                            ]}
                        ></Select>
                    </ProForm.Item>
                    <ProForm.Item label="??????" name='clusterId' rules={[{ required: true, message: '???????????????' }]} >
                        <Select
                            disabled={props.isEdit}
                            options={cluster}
                            onChange={(value: any) => {
                                BindNamespaceSelect(value, namespcaeHandler)
                                clusterIdHandler(value)
                                BindClusterName(value, cluster, clusterNameHandler)
                            }}
                        >
                        </Select>
                    </ProForm.Item>
                    <ProForm.Item label="????????????" name='namespaceId'  rules={[{ required: true, message: '?????????????????????' }]} >
                        <Select
                            disabled={props.isEdit}
                            options={namespace}
                        >
                        </Select>
                    </ProForm.Item>
                    < ProForm.Item  name='serviceEnable'>
                        <Checkbox onChange={(value) => { openScvHandler(value.target.checked) }} checked={openScv}>??????????????????</Checkbox>
                    </ProForm.Item>

                    <ProForm.Item label="????????????" name='serviceAway'>
                        <ProFormSelect options={[
                            {
                                value: 'ClusterPort',
                                label: 'ClusterPort',
                            },
                            { value: 'NodePort', label: 'NodePort' },
                        ]

                        } disabled={props.isEdit}
                        ></ProFormSelect>
                    </ProForm.Item>
                    <ProForm.Item label="????????????" name='servicePort'>
                        <Input></Input>
                    </ProForm.Item>
                </StepsForm.StepForm>
                <StepsForm.StepForm<DeploymentStep>
                    title="????????????"
                >
                    <ProForm.Item label="????????????" name='replicas' rules={[{ required: true, message: "?????????????????????" }]}>
                        <InputNumber min={0} max={20}></InputNumber>
                    </ProForm.Item>

                    <ProForm.Group label="CPU?????? 0????????????" >
                        <ProFormItem name='requestCpu' label='Request' rules={[{ required: true, message: "requestCpu????????????" }]}>
                            <InputNumber step={0.1} min={0} max={1}></InputNumber>
                        </ProFormItem>
                        <Space>
                            -
                        </Space>
                        <ProFormItem name='limitCpu' label='Limit' rules={[{ required: true, message: "limitCpu????????????" }]}  >
                            <InputNumber step={0.1} min={0} max={128}></InputNumber>
                        </ProFormItem>

                    </ProForm.Group>
                    <ProForm.Group label="????????????(MB) 0????????????">
                        <ProFormItem name='requestMemory' label='Request' rules={[{ required: true, message: "requestMemory????????????" }]}>

                            <InputNumber min={0}></InputNumber>

                        </ProFormItem>
                        <Space>
                            -
                        </Space>
                        <ProFormItem name='limitMemory' label='Limit' rules={[{ required: true, message: "limitMemory????????????" }]}>
                            <InputNumber min={0} ></InputNumber>
                        </ProFormItem>
                    </ProForm.Group>
                </StepsForm.StepForm>
            </StepsForm>
        </ProCard>
    )
}

export default DevlopmentForm