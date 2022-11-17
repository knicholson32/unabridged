# Beets-audible: Organize Your Audiobook Collection With Beets
This is my fork of the awesome Beets-Audible plug-in made by Neurrone https://github.com/Neurrone/beets-audible

This is a plugin that allows Beets to manage audiobook collections.

It fetches audiobook metadata via the Audible and [Audnex API](https://github.com/laxamentumtech/audnexus). With this data, it ensures books have the correct tags and makes the collection ready to be served by Plex, Audiobookshelf or Booksonic.

This fork is intended to be used in conjunction with my [auto-m4b](https://github.com/seanap/auto-m4b) docker this way all the folder names and functions line up.

## Motivation

This is a linux only workflow solution to quickly convert and tag your audiobook files to a standard that works with plex.  This is a CLI only tool, which is actually a great interface to quickly tag a large number of files.

This was developed to handle book files with no tags, bad tags, or that need to be named and organized in the right folder structure.

## Installation

### With Docker

1. `git clone https://github.com/seanap/beets-audible.git` # Open a terminal and clone this repository  
2. `nano beets-audible/beets/docker-compose.yml` # Edit `docker-compose.yml`  
    * Update the following lines:
      * `PUID`
      * `PGID`
      * `TZ`
      * `/path/to/plex/audibooks` # Location of your plex audiobooks folder
      * `/path/to/temp/untagged` # Location of Untagged books ready for tagging
3. `nano beets-audible/beets/config/config.yaml` # Edit `config.yaml`  
    * Update the `Plex` section at the end of the file:
      * `host` # IP of plex server
      * `token` # https://support.plex.tv/hc/en-us/articles/204059436-Finding-your-account-token-X-Plex-Token
      * `library_name` # Name of plex audiobook library
4. `cd beets-audible/beets && docker-compose up -d` # Start the container
7. `docker exec -it beets sh` # Start the interactive shell inside the beets container
8. `beet --version` # Verify that the audible plugin appears in the list of plugins.

## Usage

> :warning: **Ensure that each book is in it's own folder**, even if the audiobook only consists of a single file. This is so that the files for a book are treated as an album by Beets.


* Add books that need tagging to your `../temp/untagged` folder you configured in the `docker-compose.yml` file
* `docker exec -it beets sh -c 'beet import /untagged'` # Start the interactive shell inside the beets docker container and run beets on your `.../temp/untagged` folder.
  * ALTERNATIVE: Portainer>beets>console
> To exit the beets docker shell simply type `exit`

### Create a script shortcut that will: 
* Automatically ssh into the docker host computer from your Windwos PC
* Execute the docker exec command
* Run beets and import your `.../temp/untagged` folder

#### Windows
* Install [putty](https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html)
* Open Powershell with admin rights (Right click > `Run as Administrator`), run the following line:  
  * `Set-ItemProperty HKCU:\Console VirtualTerminalLevel -Type DWORD 1`
* Open notepad++ and save the following line as `runbeets.bat` and edit with your [USER] [IP] [PW]  
  * `plink -ssh user@192.168.0.123 -pw supersecretpass -P 22 -t (docker exec -it beets sh -c 'beet import /untagged')`
* double-click `runbeets.bat` to run


## Notes

The following sources of information are used to search for book matches in order of preference:

1. A file containing book info named `metadata.yml` (see below)
2. Album and artist tags
3. If tags are missing from the file, enabling the fromfilename plugin will attempt to deduce album and artist from file names
4. If all else fails, use the folder name as the query string

If you're not getting a match for a book, try the following:

1. Check the tags on the files being imported. The album and artist tags should be set to the book title and author respectively.
2. Press `E` when Beets prompts you about not being able to find a match. This prompts for the artist and album name. If the wrong book is being matched because there are other books with similar names on Audible, try using the audiobook's asin as the artist and title as the album.
3. Specify the book's data by using `metadata.yml` if it isn't on Audible (see the next section).

The plugin gets chapter data of each book and tries to match them to the imported files if and only if the number of imported files is the same as the number of chapters from Audible. This can fail and cause inaccurate track assignments if the lengths of the files don't match Audible's chapter data. If this happens, set the config option `match_chapters` to `false` temporarily and try again, and remember to uncomment that line once done.

### Importing Non-Audible Content

The plugin looks for a file called `metadata.yml` in each book's folder during import. If this file is present, it exclusively uses the info in it for tagging and skips the Audible lookup.

This is meant for importing audio content that isn't on Audible.

Here's an example of what `metadata.yml` should look like:

```yaml
---
# These are all required fields
title: The Lord of the Rings (BBC Dramatization)
authors: ["J. R. R. Tolkien", "Brian Sibley", "Michael Bakewell"]
narrators:
  - "Ian Holm (as Frodo)"
  - "Sir Michael Hordern (as Gandalf)"
  - "Robert Stephens (as Aragorn)"
  - "John Le Mesurier"
description: |
  This audio set includes: The Fellowship of the Ring; The Two Towers; and The Return of the King.

  Undertaking the adaptation of J.R.R. Tolkien's best-known work was an enormous task, but with its first broadcast on BBC Radio 4 on March 8, 1981, this dramatized tale of Middle Earth became an instant global classic. Thrilling dramatization by Brian Sibley and Michael Bakewell it boasts a truly outstanding cast including Ian Holm (as Frodo), Sir Michael Hordern (as Gandalf), Robert Stephens (as Aragorn), and John Le Mesurier. Tolkiens tale relates the perilous attempt by Frodo Baggins and company to defeat the evil Saruman and dispose of the Ruling Ring. Brian Sibley wrote the opening and closing narration for the character of Frodo, played by Ian Holm, who now stars as Bilbo in the feature films based on The Lord of the Rings.
genres: ["fantasy"]
releaseDate: 2008-08-19
publisher: BBC Audiobooks

# optional fields
language: English # defaults to "English" if not specified
subtitle: "some subtitle"
series: The Lord Of The Rings
seriesPosition: "1-3"
```

The copyartifacts plugin ensures that `metadata.yml` is copied over during the import, as it gets left in the source folder otherwise.

## Folder Structure

The config above places books according to this folder structure, which can be changed by editing the path config.

```
Terry Goodkind/
  Sword of Truth/
    1 - Wizards First Rule/
      cover.png
      desc.txt
      reader.txt
      01 - Wizards first rule (1989).m4b
George Orwell/
  Animal Farm/
    01 - Animal Farm (1935).m4b
    cover.png
    desc.txt
    reader.txt
```

Desc.txt and reader.txt contain the book description and narrator populated from Audible. These are needed for Booksonic servers only.

## Tags Written

The plugin writes the following tags:

| ID3 Tag                          | Audible.com Value                                                                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `TIT1` (CONTENTGROUP)            | Series, Book #                                                                                                                      |
| `TALB` (ALBUM)                   | Title                                                                                                                               |
| `TIT3` (SUBTITLE)                | Subtitle                                                                                                                            |
| `TPE1` (ARTIST)                  | Author, Narrator                                                                                                                    |
| `TPE2` (ALBUMARTIST)             | Author                                                                                                                              |
| `TCOM` (COMPOSER)                | Narrator                                                                                                                            |
| `TCON` (GENRE)                   | Genre1/Genre2                                                                                                                       |
| `TDRC` and `TDRL` (release date) | audio publication date                                                                                                              |
| `COMM` (COMMENT)                 | Publisher's Summary (MP3)                                                                                                           |
| `desc` (DESCRIPTION)             | Publisher's Summary (M4B)                                                                                                           |
| `TSOA` (ALBUMSORT)               | If ALBUM only, then %Title%<br>If ALBUM and SUBTITLE, then %Title% - %Subtitle%<br>If Series, then %Series% %Series-part% - %Title% |
| `TPUB` (PUBLISHER)               | Publisher                                                                                                                           |
| `ASIN` (ASIN)                    | Amazon Standard Identification Number                                                                                               |
| `ITUNESMEDIATYPE`                | "Audiobook"                                                                                                                         |
| `MVNM` (MOVEMENTNAME)            | Series                                                                                                                              |
| `MVIN` (MOVEMENT)                | Series Book #                                                                                                                       |
| `TXXX_SERIES` (SERIES)           | Series                                                                                                                              |
| `TXXX_SERIESPART`                | Series position                                                                                                                     |

## Known Limitations

1. Anything that would cause Beets to move data (e.g, if performing an update after changing the path format) only moves the audio files and cover, leaving desc.txt and reader.txt behind. They need to be moved manually. This is because Beets doesn't associate these files with the album in its database.

## Plex Integration

If the directory where Beets imports audiobooks to is also where you've set Plex to serve content from, the [plexupdate plugin] (https://beets.readthedocs.io/en/stable/plugins/plexupdate.html) is enabled by default.  It will automatically notify Plex when new books are imported.
