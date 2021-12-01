import React, { SetStateAction, useState, Dispatch } from 'react';
import ProForm, {
    StepsForm,
    ProFormText,
    ProFormDatePicker,
    ProFormSelect,
    ProFormTextArea,
    ProFormCheckbox
} from '@ant-design/pro-form';
import ProCard from '@ant-design/pro-card';
import { Button, Input, Checkbox, Modal, InputNumber, Space } from 'antd';
import ProFormItem from '@ant-design/pro-form/lib/components/FormItem';
import { BindCluster } from './service';
import { DeploymentStep1, DeploymentStep2 } from './devlopment_data';


export interface Props {
    visibleFunc: [boolean, Dispatch<SetStateAction<boolean>>]
}

const DevlopmentForm: React.FC<Props> = (props: Props) => {

    return (
        <ProCard>
            <StepsForm
                stepsFormRender={(dom, submitter) => {
                    return (
                        <Modal
                            title="创建部署"
                            width={600}
                            onCancel={() => { props.visibleFunc[1](false) }}
                            visible={props.visibleFunc[0]}
                            footer={submitter}
                            destroyOnClose
                        >
                            {dom}
                        </Modal>
                    );
                }}
            >

                <StepsForm.StepForm<DeploymentStep1>
                    title="部署方式"
                >
                    <ProForm.Item label="部署名称">
                        <Input></Input>
                    </ProForm.Item>
                    <ProForm.Item label="环境级别">
                        <ProFormSelect></ProFormSelect>
                    </ProForm.Item>
                    <ProForm.Item label="集群">
                        <ProFormSelect request={BindCluster}
                        ></ProFormSelect>
                    </ProForm.Item>
                    <ProForm.Item label="命名空间">
                        <ProFormSelect
                        ></ProFormSelect>
                    </ProForm.Item>
                    <ProForm.Item >
                        <Checkbox >开启服务访问</Checkbox>
                    </ProForm.Item>
                    <ProForm.Item label="服务方式">
                        <ProFormSelect options={[
                            {
                                value: 'ClusterPort',
                                label: 'ClusterPort',
                            },
                            { value: 'NodePort', label: 'NodePort' },
                        ]}
                        ></ProFormSelect>
                    </ProForm.Item>
                    <ProForm.Item label="服务端口">
                        <Input></Input>
                    </ProForm.Item>
                </StepsForm.StepForm>
                <StepsForm.StepForm<DeploymentStep2>
                    title="实例配置"
                >
                    <ProForm.Item label="副本数量">
                        <InputNumber defaultValue={1}></InputNumber>
                    </ProForm.Item>

                    <ProForm.Group label="CPU限制">
                        <ProFormItem>
                            <Space>Request
                                <InputNumber defaultValue={0} ></InputNumber>
                            </Space>
                        </ProFormItem>
                        <Space>
                            -
                        </Space>
                        <ProFormItem>
                            <Space>Limit
                                <InputNumber defaultValue={1}></InputNumber>
                            </Space>
                        </ProFormItem>
                        核
                    </ProForm.Group>
                    <ProForm.Group label="内存限制">
                        <ProFormItem>
                            <Space>Request
                                <InputNumber defaultValue={0} ></InputNumber>
                            </Space>
                        </ProFormItem>
                        <Space>
                            -
                        </Space>
                        <ProFormItem>
                            <Space>Limit
                                <InputNumber defaultValue={1024} ></InputNumber>
                            </Space>
                        </ProFormItem>
                        MB
                    </ProForm.Group>
                </StepsForm.StepForm>
            </StepsForm>
        </ProCard>
    )
}

export default DevlopmentForm