import os
import sys

#Validating arguments
if len(sys.argv) < 2:
    raise Exception('No environment specified')
if len(sys.argv) == 2:
    profilePresent = False
if len(sys.argv) == 3:
    profilePresent = True
    profile = sys.argv[2]
if len(sys.argv) >3:
    raise Exception('Too many arguments')

#Setting lambda name based on env
env = sys.argv[1]

if env not in ['dev', 'uat', 'prod']:
    print('Not a valid environment')
    sys.exit(1)
#Choosing the correct env file
SOURCE_ENV_FILE = '.env'
TEMP_ENV_FILE = '.env.temp'
os.rename(SOURCE_ENV_FILE, TEMP_ENV_FILE)
try:
    os.rename('.env.'+env, '.env')
except Exception as e:
    os.rename('.env.temp', '.env')
    print(f"Error: {str(e)}")
    sys.exit(1)
#Deployment command
try:
    command = "npx serverless deploy --stage " + env
    if profilePresent:
        command = command + " --aws-profile " + profile
    os.system(command)
    print('Executed')
except Exception as e:
    print(f"Error: {str(e)}")
finally:
    os.rename('.env', '.env.' + env)
    os.rename('.env.temp', '.env')