# Comparing Different IaC Tools for Serverless Deployment : (2) Pulumi  + Gitlab

# install dependencies:
- pulumi
- node.js

# Download the mimic respository
- This repository clone the source code from : https://github.com/olcortesb/mimic-src
- In the pipeline this step download the mimic repository
```yml
# Clone repository
git-clone-lambda-code:
  stage: git-clone-lambda-code
  image: alpine
  before_script:
    - apk add git
  script:
    - git clone --depth=1 -b main https://gitlab-ci-token:${CI_JOB_TOKEN}@gitlab.com/serverless4741110/lambdas-src repository
    - rm -rf source_code/.git
    - cd repository
    - rm LICENSE
    - rm README.md
  artifacts:
    paths:
      - repository
```
# push to gilab
This laboratory is prepare run on Gitlab 

# Deploy / Destroy

The deploy stage:

```yml
pulumi-up:
  stage: infrastructure-update
  before_script:
    - ls
    - chmod +x ./scripts/*.sh
    - ./scripts/setup.sh
  script:
    - ./scripts/run-pulumi.sh
  # Create an artifact archive with just the pulumi log file,
  # which is created using console-redirection in run-pulumi.sh.
  artifacts:
    paths:
    - pulumi-log.txt
    # This is just a sample of how artifacts can be expired (removed) automatically in GitLab.
    # You may choose to not set this at all based on your organization's or team's preference.
    expire_in: 1 week
  # This job should only be created if the pipeline is created for the master (or main) branch.
  rules:
  - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH && $DESTROY != "OK"

```

The destroy stage:

```yml
pulumi-destroy:
  stage: infrastructure-destroy
  before_script:
    - ls
    - chmod +x ./scripts/*.sh
    - ./scripts/setup.sh
  script:
    - ./scripts/destroy-pulumi.sh
  # Create an artifact archive with just the pulumi log file,
  # which is created using console-redirection in run-pulumi.sh.
  rules:
  - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH && $DESTROY == "OK"

pulumi-preview:
  stage: infrastructure-update
  before_script:
    - chmod +x ./scripts/*.sh
    - ./scripts/setup.sh
  script:
    - ./scripts/pulumi-preview.sh
  only:
  - merge_requests
```


# References:

- https://www.pulumi.com/docs/using-pulumi/continuous-delivery/gitlab-ci/

- https://www.pulumi.com/

