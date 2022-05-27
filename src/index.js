'use strict'
const BbPromise = require('bluebird')
const path = require('path')
const _ = require('lodash');

class ServerlessPackageLocationCustomizer {
  constructor(serverless, options) {
    this.serverless = serverless
    this.options = options || {}
    this.provider = this.serverless.getProvider('aws')
    
    this.commands = {
      package: {
        options: {
          's3-bucket': {
            usage: 'Specify the name of the deployment bucket',
            type: 'string'
          },
          's3-path': {
            usage: 'Specify the path to the package in the deployment bucket',
            type: 'string'
          }
        }
      }
    }

    this.hooks = {
      'before:package:initialize': async () => {
        if (this.options['s3-bucket']) {
          this.serverless.service.provider.deploymentBucket = this.options['s3-bucket']
        }
      },
      'after:package:compileLayers': async () => {
        if (!this.options['s3-path']) {
          return BbPromise.reject(new Error("Missing s3-path option"));
        }

        return this.updateLayers();
      },
      'after:package:compileFunctions': async () => {
        if (!this.options['s3-path']) {
          return BbPromise.reject(new Error("Missing s3-path option"));
        }

        return this.updateFunctions();
      }
    }
  }

  async updateLayers() {
    _.each(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, function(res) {
        if (res.Type === 'AWS::Lambda::LayerVersion') {
          let layerName = res.Properties.LayerName
          this.serverless.cli.log('Updating Lambda layer '+this.provider.naming.getNormalizedFunctionName(layerName), res);
          let s3FileName = path.basename(res.Properties.Content.S3Key);
          res.Properties.Content.S3Key = this.options['s3-path'] + '/' + s3FileName;
        }
     }.bind(this));
  }

  async updateFunctions() {
    _.each(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, function(res) {
       if (res.Type === 'AWS::Lambda::Function') {
          let functionName = res.Properties.FunctionName
          this.serverless.cli.log('Updating Lambda function '+this.provider.naming.getNormalizedFunctionName(functionName), res);
          let s3FileName = path.basename(res.Properties.Code.S3Key);
          res.Properties.Code.S3Key = this.options['s3-path'] + '/' + s3FileName;
        }
     }.bind(this));
  }


}
module.exports = ServerlessPackageLocationCustomizer

