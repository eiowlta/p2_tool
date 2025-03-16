# Persona 2 modding tools

## Requirements
A recent version of nodejs or equivalent.
A copy of your unmoddified iso.

## Installation
The easiest way to get started is to install with your favorite javascript package manager.
`npm install --global p2_tools`

If you have a more advanced use case or know what you're doing, you can also consume the project as a node module, or just directly by cloning this repository.

## Usage
In general you can view help for the command by passing --help or running it without arguments.  


### Mod structure
The mod structure has to follow the structure of the original ISO, but you can remap files and directories using a files.json.  All subfolders are assumed to be descendents.  
You can fully extract the ISO using `p2_modtool extractAll <iso> -o <output_folder> --game <is|ep>`.  From this folder you can the original versions of each file as well as the paths within the ISO they exist.
For an example of a more complete project structure, please check out the [p2ep_template](https://github.com/eiowlta/p2ep_template)

### Building a mod
To build a mod, simply run `p2_modtool <path/to/unmodded.is> <path/to/mod_folder> --output <working_directory> --iso_output <output.iso>`  If using innocent sin, please also remember to pass `--variant <eu|us>` to specify which variant of the game you are running.  
The path to the mod folder is the folder containing mod.json, but do not include mod.json in the command.