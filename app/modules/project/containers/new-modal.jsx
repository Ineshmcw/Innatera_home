/**
 * Copyright (c) 2014-present PlatformIO <contact@platformio.org>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as actions from '../actions';
import * as path from '../../core/path';

import { Checkbox, Form, Icon, Input, Modal, Select, Tooltip } from 'antd';

import BoardSelect from '../../platform/containers/board-select';
import FileExplorer from '../../core/containers/file-explorer';
import ProjectInitCarousel from '../components/init-carousel';
import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { osOpenUrl } from '../../core/actions';
import { selectStorageItem } from '../../../store/selectors';

class ProjectNewModal extends React.Component {
  static propTypes = {
    form: PropTypes.object.isRequired,
    visible: PropTypes.bool.isRequired,
    onCancel: PropTypes.func.isRequired,

    projectsDir: PropTypes.string,
    spineDir: PropTypes.string,
    addProject: PropTypes.func.isRequired,
    openProject: PropTypes.func.isRequired,
    initProject: PropTypes.func.isRequired,
    osOpenUrl: PropTypes.func.isRequired,
    buildDir: PropTypes.string,
  };
  constructor() {

    super(...arguments);
    this.state = {
      selectedFramework: null,
      useDefaultLocation: true,
      useDefaultSpineLocation: true,
      useDefaultBuildLocation: true,
      frameworks: [],
      projectLocation: null,
      spineLocation: '',
      inProgress: false,
      BuildLocation: null,
    };
  }

  onDidBoard(board) {
    const frameworks = board.frameworks || [];
    this.setState({
      selectedFramework: frameworks.length ? frameworks[0].name : null,
      frameworks,
    });
  }

  onDidFramework(framework) {
    this.setState({
      selectedFramework: framework,
    });
  }

  onDidUseDefaultLocation(e) {
    this.setState({
      useDefaultLocation: e.target.checked,
    });
  }
  
  onDidUseDefaultSpineLocation(e) {
    this.setState({
      useDefaultSpineLocation: e.target.checked,
    });
  }
  onDidUseDefaultBuildLocation(e) {
    this.setState({
      useDefaultBuildLocation: e.target.checked,
    });
  }


  onDidProjectLocation(projectLocation) {
    this.props.form.resetFields(['isCustomLocation']);
    this.setState({
      projectLocation,
    });
  }

  onDidSpineLocation(spineLocation) {
    this.props.form.resetFields(['isCustomSpineLocation']);
    this.setState({
      spineLocation,
    });
  }
  onDidBuildLocation(BuildLocation) {
    this.props.form.resetFields(['isBuildLocation']);
    this.setState({
      BuildLocation,
    });
  }
  onDidFinish() {
    this.props.form.resetFields(['isCustomLocation']);
    this.props.form.validateFields((err, values) => {
      if (err) {
        return;
      }
      this.setState({
        inProgress: true,
      });
  
      const projectLocation = this.state.useDefaultLocation
        ? this.props.projectsDir
        : this.state.projectLocation;
      const spineLocation = this.state.useDefaultSpineLocation
        ? this.props.spineDir
        : this.state.spineLocation;
      const BuildLocation = this.state.useDefaultBuildLocation
        ? path.join(projectLocation, values.name , 'build')
        : path.join(this.state.BuildLocation, 'build');
      this.props.initProject(
        values.board.id,
        this.state.selectedFramework,
        path.join(projectLocation, values.name),
        spineLocation,
        BuildLocation,
        (err, location) => {
          this.setState({
            inProgress: false,
          });
          if (!err) {
            this.props.addProject(location);
            this.onDidCancel(location);
          }
        }
      );
    });
  }

  onDidCancel(projectDir) {
    this.setState({
      inProgress: false,
    });
    this.props.onCancel(projectDir);
  }

  render() {
    return (
      <Modal
        visible={this.props.visible}
        confirmLoading={this.state.inProgress}
        width={600}
        title="Project Wizard"
        okText={this.state.inProgress ? 'Please wait...' : 'Finish'}
        onOk={::this.onDidFinish}
        onCancel={::this.onDidCancel}
      >
        {this.renderBody()}
      </Modal>
    );
  }

  renderBody() {
    if (this.state.inProgress) {
      return <ProjectInitCarousel osOpenUrl={this.props.osOpenUrl} />;
    }
    const { getFieldDecorator } = this.props.form;
    return (
      <Form hideRequiredMark>
        <div className="block">
          This wizard allows you to <b>create new</b> PlatformIO project or{' '}
          <b>update existing</b>. In the last case, you need to uncheck &quot;Use
          default location&quot; and specify path to existing project.
        </div>
        <Form.Item colon={false} label="Name" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
          {getFieldDecorator('name', {
            rules: [
              {
                required: true,
                whitespace: true,
                pattern: /^[a-z\d\_\-\. ]+$/i,
                message: 'Please input a valid name for project folder! [a-z0-9_-. ]',
              },
            ],
          })(<Input placeholder="Project name" />)}
        </Form.Item>
        <Form.Item colon={false} label="Board" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
          {getFieldDecorator('board', {
            rules: [
              {
                required: true,
                message: 'Please select a board!',
              },
            ],
          })(<BoardSelect onChange={::this.onDidBoard} />)}
        </Form.Item>
        <Form.Item colon={false} label="Framework" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
          <Select
            value={this.state.selectedFramework}
            style={{ width: '100%' }}
            size="large"
            disabled={!this.state.selectedFramework}
            onChange={::this.onDidFramework}
          >
            {this.state.frameworks.map((item) => (
              <Select.Option key={item.name} value={item.name} title={item.title}>
                {item.title}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item colon={false} label="Location" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
          {getFieldDecorator('isCustomLocation', {
            rules: [
              {
                validator: (rule, value, callback) =>
                  setTimeout(
                    () =>
                      callback(
                        this.state.useDefaultLocation || this.state.projectLocation
                          ? undefined
                          : true
                      ),
                    200
                  ),
                message: 'Please select a custom project location!',
              },
            ],
          })(
            <Checkbox
              onChange={::this.onDidUseDefaultLocation}
              checked={this.state.useDefaultLocation}
            >
              Use default location
              <Tooltip
                title={`Default location for PlatformIO Projects is: "${this.props.projectsDir}"`}
                overlayStyle={{ wordBreak: 'break-all' }}
              >
                <Icon type="question-circle" style={{ marginLeft: '5px' }} />
              </Tooltip>
            </Checkbox>
          )}
        </Form.Item>
        {!this.state.useDefaultLocation && this.renderExplorer()}

        {this.state.selectedFramework === 'spine' && (
          <Form.Item colon={false} label="Spine" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} style={{ marginTop: '-10px' }}>
            {getFieldDecorator('isCustomSpineLocation', {
              rules: [
                {
                  validator: (rule, value, callback) =>
                    setTimeout(
                      () =>
                        callback(
                          this.state.useDefaultSpineLocation || this.state.spineLocation
                            ? undefined
                            : true
                        ),
                      200
                    ),
                  message: 'Please select a custom spine folder location!',
                },
              ],
            })(
              <Checkbox
                onChange={::this.onDidUseDefaultSpineLocation}
                checked={this.state.useDefaultSpineLocation}
              >
                Use default spine location
                <Tooltip
                  title={`Default location for Spine folder is: "${this.props.spineDir}"`}
                  overlayStyle={{ wordBreak: 'break-all' }}
                >
                  <Icon type="question-circle" style={{ marginLeft: '5px' }} />
                </Tooltip>
              </Checkbox>
            )}
          </Form.Item>
        )}
        {!this.state.useDefaultSpineLocation && this.renderSpineExplorer()}

        {this.state.selectedFramework==='combine' &&(
          <Form.Item colon={false} label="Build Dir" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} style={{ marginTop: '-10px' }}>
            {getFieldDecorator('isBuildLocation', {
              rules: [
                {
                  validator: (rule, value, callback) =>
                    setTimeout(
                      () =>
                        callback(
                          this.state.useDefaultBuildLocation || this.state.BuildLocation
                            ? undefined
                            : true
                        ),
                      200
                    ),
                  message: 'Please select a Build Directory location!',
                },
              ],
            })(
              <Checkbox
                onChange={::this.onDidUseDefaultBuildLocation}
                checked={this.state.useDefaultBuildLocation}
              >
                Use default Build Directory location
                <Tooltip
                  title={`Default location for Build Directory is: "${
                  path.join(
                    this.state.useDefaultLocation
                    ? this.props.projectsDir
                    : this.state.projectLocation
                    , (this.props.form.getFieldValue('name') || 'project'), 'build')}"`}
                  overlayStyle={{ wordBreak: 'break-all' }}
                >
                  <Icon type="question-circle" style={{ marginLeft: '5px' }} />
                </Tooltip>
              </Checkbox>
        )}
          </Form.Item>
        )}
        {!this.state.useDefaultBuildLocation && this.renderBuildExplorer()}

      </Form>
    );
  }

  renderExplorer() {
    return (
      <div>
        <div style={{ marginBottom: '5px' }}>
          Choose a location where we will create project folder:
        </div>
        <FileExplorer ask="directory" onSelect={::this.onDidProjectLocation} />
      </div>
    );
  }

  renderSpineExplorer() {
    return (
      <div>
        <div style={{ marginBottom: '5px' }}>
          Choose a location for the Spine folder:
        </div>
        <FileExplorer ask="directory" onSelect={::this.onDidSpineLocation} />
      </div>
    );
  }
  renderBuildExplorer() {
    return (
      <div>
        <div style={{ marginBottom: '5px' }}>
          Choose a location for the Build folder:
        </div>
        <FileExplorer ask="directory" onSelect={::this.onDidBuildLocation} />
      </div>
    );
  }

}

// Redux

function mapStateToProps(state) {
  return {
    projectsDir: selectStorageItem(state, 'projectsDir'),
    spineDir: selectStorageItem(state, 'spineDir'),
    buildDir: selectStorageItem(state, 'buildDir'),
    
  };
}

export default connect(mapStateToProps, {
  ...actions,
  osOpenUrl,
})(Form.create()(ProjectNewModal));
