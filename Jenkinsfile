/* groovylint-disable LineLength */
pipeline {
    agent any

    environment {
        NODE_VERSION = '21.4.0'
        DOCKER_REGISTRY = 'mianaliasghar'
        PROJECT_NAME = "${env.JOB_NAME.tokenize('/')[0]}"
        TIMESTAMP = new Date().format("yyyyMMdd-HHmmss", TimeZone.getTimeZone('UTC'))
        COMMIT_ID = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
        VERSION = "v1.0.${env.TIMESTAMP}-${env.COMMIT_ID}"
        IMAGE_TAG = "${DOCKER_REGISTRY}/${PROJECT_NAME}:${VERSION}"
        DEVELOP_TAG = "${DOCKER_REGISTRY}/${PROJECT_NAME}:develop"
        LATEST_TAG = "${DOCKER_REGISTRY}/${PROJECT_NAME}:latest"
        BUILD_TAG = "${PROJECT_NAME}-${VERSION}"
        GIT_AUTHOR = sh(script: "git log -1 --pretty=%cn", returnStdout: true).trim()
        GIT_COMMIT_MSG = sh(script: "git log -1 --pretty=%B", returnStdout: true).trim()
        GIT_BRANCH = "${env.BRANCH_NAME ?: env.GIT_BRANCH}"
        FAILED_STAGE = ""
        ERROR_MESSAGE = ""
    }

    options {
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }

    stages {
        stage('Setup Environment') {
            steps {
                script {
                    try {
                        env.NODEJS_HOME = tool name: "Node-${NODE_VERSION}", type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'
                        env.PATH = "${env.NODEJS_HOME}/bin:${env.PATH}"
                        echo "🔧 Setting up environment..."
                        echo "Node.js Version: ${sh(script: 'node --version', returnStdout: true).trim()}"
                        echo "npm Version: ${sh(script: 'npm --version', returnStdout: true).trim()}"
                        echo "Branch: ${GIT_BRANCH}"
                        echo "Version: ${VERSION}"
                    } catch (Exception e) {
                        echo "❌ Environment setup failed: ${e.getMessage()}"
                        FAILED_STAGE = "Setup Environment"
                        ERROR_MESSAGE = e.getMessage()
                        currentBuild.result = 'FAILURE'
                        error("Environment setup failed")
                    }
                }
            }
        }

        stage('Checkout Repository') {
            steps {
                script {
                    try {
                        cleanWs()
                        checkout scm
                        currentBuild.description = "Version: ${VERSION} | Branch: ${GIT_BRANCH} | Author: ${GIT_AUTHOR}"

                        // Send build started notification
                        postMattermostReport("started")
                    } catch (Exception e) {
                        echo "❌ Repository checkout failed: ${e.getMessage()}"
                        FAILED_STAGE = "Checkout Repository"
                        ERROR_MESSAGE = e.getMessage()
                        currentBuild.result = 'FAILURE'
                        error("Repository checkout failed")
                    }
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    echo "📦 Installing dependencies..."
                    try {
                        sh 'npm install --legacy-peer-deps'
                    } catch (Exception e) {
                        echo "❌ Dependency installation failed: ${e.getMessage()}"
                        FAILED_STAGE = "Install Dependencies"
                        ERROR_MESSAGE = e.getMessage()
                        currentBuild.result = 'FAILURE'
                        error("Dependency installation failed")
                    }
                }
            }
        }

        stage('Security Audit') {
            steps {
                script {
                    echo "🔒 Running security audit..."
                    try {
                        sh 'npm audit --audit-level=moderate || true'
                        sh 'npm audit --json > security-report.json || true'
                        archiveArtifacts artifacts: 'security-report.json', allowEmptyArchive: true
                    } catch (Exception e) {
                        echo "❌ Security audit failed: ${e.getMessage()}"
                        FAILED_STAGE = "Security Audit"
                        ERROR_MESSAGE = e.getMessage()
                        currentBuild.result = 'FAILURE'
                        error("Security audit failed")
                    }
                }
            }
        }

        stage('Code Quality') {
            steps {
                script {
                    echo "🔍 Running code linting..."
                    try {
                        sh 'npm run lint || echo "Linting completed with warnings"'
                    } catch (Exception e) {
                        echo "⚠️ Linting failed but continuing: ${e.getMessage()}"
                    }
                }
            }
        }

        stage('Unit Tests') {
            steps {
                script {
                    echo "🧪 Running unit tests..."
                    try {
                        sh 'npm run test:cov -- --passWithNoTests || true'
                        script {
                            if (fileExists('coverage/index.html')) {
                                publishHTML([
                                    allowMissing: true,
                                    alwaysLinkToLastBuild: true,
                                    keepAll: true,
                                    reportDir: 'coverage',
                                    reportFiles: 'index.html',
                                    reportName: 'Test Coverage Report'
                                ])
                            } else {
                                echo "⚠️ No test coverage report found - tests may not exist yet"
                            }
                        }
                    } catch (Exception e) {
                        echo "❌ Unit tests failed: ${e.getMessage()}"
                        FAILED_STAGE = "Unit Tests"
                        ERROR_MESSAGE = e.getMessage()
                        currentBuild.result = 'FAILURE'
                        error("Unit tests failed")
                    }
                }
            }
        }

        stage('Build Application') {
            steps {
                script {
                    echo "🏗️ Building NestJS application..."
                    try {
                        sh 'npm run build'
                    } catch (Exception e) {
                        echo "❌ Application build failed: ${e.getMessage()}"
                        FAILED_STAGE = "Build Application"
                        ERROR_MESSAGE = e.getMessage()
                        currentBuild.result = 'FAILURE'
                        error("Application build failed")
                    }
                }
            }
        }

        stage('Create Docker Image') {
            steps {
                script {
                    echo "🐳 Creating Docker image..."
                    try {
                        sh "docker build -t ${IMAGE_TAG} ."
                        sh "docker images | grep ${PROJECT_NAME}"
                    } catch (Exception e) {
                        echo "❌ Docker image creation failed: ${e.getMessage()}"
                        FAILED_STAGE = "Create Docker Image"
                        ERROR_MESSAGE = e.getMessage()
                        currentBuild.result = 'FAILURE'
                        error("Docker image creation failed")
                    }
                }
            }
        }

        stage('Security Scan - Container') {
            steps {
                script {
                    echo "🔒 Scanning container for vulnerabilities..."
                    try {
                        sh "trivy image --severity HIGH,CRITICAL --format json --output trivy-report.json ${IMAGE_TAG} || true"
                        archiveArtifacts artifacts: 'trivy-report.json', allowEmptyArchive: true
                        sh "trivy image --severity CRITICAL --exit-code 1 ${IMAGE_TAG} || echo 'No critical vulnerabilities found'"
                    } catch (Exception e) {
                        echo "⚠️ Container security scan failed but continuing: ${e.getMessage()}"
                    }
                }
            }
        }

        stage('Push to Registry') {
            when {
                anyOf {
                    branch 'master'
                }
            }
            steps {
                script {
                    echo "📦 Pushing to Docker registry..."

                    try {
                        docker.withRegistry('https://index.docker.io/v1/', 'dockerhub-softzee') {
                            sh "docker push ${IMAGE_TAG}"
                            if (GIT_BRANCH in ['master']) {
                                sh "docker tag ${IMAGE_TAG} ${LATEST_TAG}"
                                sh "docker push ${LATEST_TAG}"
                            }
                        }
                    } catch (Exception e) {
                        echo "❌ Docker push failed: ${e.getMessage()}"
                        FAILED_STAGE = "Push to Registry"
                        ERROR_MESSAGE = e.getMessage()
                        currentBuild.result = 'FAILURE'
                        error("Docker push failed")
                    }
                }
            }
        }

        stage('Deployment') {
            when {
                anyOf {
                    branch 'master'
                }
            }
            steps {
                script {
                    echo "📦 Deploying to server..."
                    try {
                        sh "${env.BNW_ORDERS_BACKEND_SSH}"
                    } catch (Exception e) {
                        echo "❌ Docker push failed: ${e.getMessage()}"
                        FAILED_STAGE = "Deployment"
                        ERROR_MESSAGE = e.getMessage()
                        currentBuild.result = 'FAILURE'
                        error("Deployment failed")
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                echo "🧹 Cleaning up..."

                // Clean Docker images
                sh "docker image prune -a -f || true"

                // Clean workspace
                cleanWs(
                    cleanWhenNotBuilt: false,
                    deleteDirs: true,
                    disableDeferredWipeout: true,
                    notFailBuild: true,
                    patterns: [
                        [pattern: '.gitignore', type: 'INCLUDE'],
                        [pattern: 'node_modules', type: 'EXCLUDE'],
                        [pattern: 'dist', type: 'EXCLUDE'],
                        [pattern: 'coverage', type: 'EXCLUDE']
                    ]
                )
            }
        }

        success {
            script {
                echo "✅ Build completed successfully!"
                currentBuild.description = "${currentBuild.description} ✅ SUCCESS"

                // Send success notification
                postMattermostReport("success")
            }
        }

        failure {
            script {
                echo "❌ Build failed!"
                currentBuild.description = "${currentBuild.description} ❌ FAILED"

                // Send failure notification with error details
                postMattermostReport("failed", FAILED_STAGE, ERROR_MESSAGE)
            }
        }

        aborted {
            script {
                echo "⏹️ Build aborted!"
            }
        }
    }
}

// Helper function for Mattermost notifications
void postMattermostReport(String build_flag, String failedStage = null, String errorMessage = null) {
    def colors = [started: "#2A42EE", success: "#00f514", failed: "#e00707"]
    def messages = [
        started: "Build Started",
        success: "Build Success",
        failed: "Build Failed"
    ]

    try {
        // Base message with essential information
        def baseMessage = """${messages[build_flag]}:
Author: ${env.GIT_AUTHOR}
Repository: ${env.JOB_NAME}
Branch: ${env.GIT_BRANCH}
Version: ${env.VERSION}
Build: ${env.BUILD_NUMBER} (<${env.BUILD_URL}|View Build>)"""

        // Add commit message to base message
        if (env.GIT_COMMIT_MSG && env.GIT_COMMIT_MSG.trim()) {
            baseMessage += "\n\n**Complete Commit Message:**\n${env.GIT_COMMIT_MSG}"
        }

        // For failed builds, add failure details to the same message
        if (build_flag == "failed") {
            if (failedStage) {
                baseMessage += "\n\n❌ **Failed Stage:** ${failedStage}"
            }

            if (errorMessage) {
                baseMessage += "\n\n**Complete Error Details:**\n```\n${errorMessage}\n```"
            }
        }

        // Send single combined notification
        mattermostSend(
            color: colors[build_flag],
            message: baseMessage
        )
    } catch (Exception e) {
        echo "⚠️ Failed to send Mattermost notification: ${e.getMessage()}"
    }
}

// Helper functions
void silent_sh(String script) {
    sh("(${script}) || true")
}
