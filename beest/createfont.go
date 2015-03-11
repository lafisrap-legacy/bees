	package main

import (
	"encoding/xml"
	"fmt"
	"github.com/codegangsta/cli"
	"os"
	"strings"
	"strconv"
	"regexp"
	"math"
)

type frame struct {
	x int
	y int
	w int
	h int
} 

var _b_regexFindRect = regexp.MustCompile("[0-9]+")

func createFont(c *cli.Context) {
	// get input file name
	pFile := c.String("plist")
	if pFile == "" {
		fmt.Println("specify a plist file name for input")
	} else {
		if pFile[len(pFile)-6:] != ".plist" {
			pFile = pFile + ".plist"
		}
	}

	// get output file name
	fntFile := c.String("fnt")
	if fntFile == "" {
		fntFile = pFile[:len(pFile)-6] + ".fnt"
	} else if fntFile[len(fntFile)-4:] != ".fnt" {
		fntFile = fntFile + ".fnt"
	}

	// open plist file
	pInput, err := os.Open(pFile)
	if err != nil {
		fmt.Println("Couldn't open ", pFile)
		return
	}
	defer pInput.Close()

	// retrieve XML
	pList := make(map[string]interface{})
	decoder := xml.NewDecoder(pInput)

	readToken(decoder, pList, "main")
	
	fntOutput, err := os.Create(fntFile)
	if err != nil {
		fmt.Println("Couldn't open ", pFile, "(", err.Error(), ")")
		return		
	}
	defer fntOutput.Close()
	
	// create fnt file ... info line
	fntName := c.String("name")
	if fntName == "" {
		pos := strings.LastIndex(fntFile, "/")
		if pos == -1 {
			pos = 0
		}
		fntName = fntFile[pos+1:len(fntFile)-4] 
	}
	frames := pList["plist"].(map[string]interface{})["frames"].(map[string]interface{})
	var max float64 = 0;
	for f := range frames {
		frame := frames[f].(map[string]interface{})["frame"].(frame)
		max = math.Max(max, float64(frame.h))
	}
	fntOutput.WriteString("info face=\""+fntName+"\" size="+strconv.Itoa(int(max))+" bold=0 italic=0 charset=\"\" unicode=0 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=0,0\n")
	
	
/*	info face="American Typewriter" size=36 bold=0 italic=0 charset="" unicode=0 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=0,0
common lineHeight=42 base=33 scaleW=384 scaleH=384 pages=1 packed=0
page id=0 file="amtype36.png"
chars count=104

	
	for f := range frames {
		frame := frames[f].(map[string]interface{})
		for props := range frame {
			fmt.Println(f,"=>",props)
		}
	}*/
}

func readToken(decoder *xml.Decoder, storage map[string]interface{}, key string) {

	for {
		token, err := decoder.Token()
		if token == nil {
			fmt.Println("End of XML file:", err.Error())
			return
		}

		switch elem := token.(type) {
		case xml.StartElement:
			name := elem.Name.Local
			fmt.Println("StartElement:", elem)
			switch name {
			case "plist":
				key = "plist"
				fmt.Println("Reading token Plist")
			case "dict":
				fmt.Println("Reading token dict with key", key)
				newMap := make(map[string]interface{})
				storage[key] = newMap
				readToken(decoder, newMap, "")
			case "key":
				key = getElement(decoder)
				fmt.Println("New key:", key)
			case "string":
				str := getElement(decoder)
				switch key {
				case "frame":
					fallthrough
				case "sourceColorRect":
					var data frame
					arr := _b_regexFindRect.FindAllString(str, -1)
					data.x, _ = strconv.Atoi(arr[0])
					data.y, _ = strconv.Atoi(arr[1])
					data.w, _ = strconv.Atoi(arr[2])
					data.h, _ = strconv.Atoi(arr[3])
					storage[key] = data
				default:
					storage[key] = str 					
				}
				fmt.Println("New string for", key, ":", storage[key])
			case "integer":
				storage[key] = getElement(decoder)
				fmt.Println("New integer for", key, ":", storage[key])
			case "false":
				storage[key] = false
				fmt.Println("New bool for", key, ": false")
			case "true":
				storage[key] = true
				fmt.Println("New bool for", key, ": true")
			case "array":
				storage[key] = getArray(decoder)
				fmt.Println("New array for", key)
			default:
				fmt.Println("Unknown type: " + name)
			}
		case xml.EndElement:
			name := elem.Name.Local
			fmt.Println("Got EndElement:",name)
			if name == "dict" || name == "plist" {
				return
			}
		case xml.CharData:
			fmt.Println("Got CharData:",string(elem))
		default:
			fmt.Println("Got something else:",elem)
		}
	}
}

func getElement(decoder *xml.Decoder) string {
	token, _ := decoder.Token()
	var result string

	switch elem := token.(type) {
	case xml.CharData:
		result = string(elem)
		
		token, _ := decoder.Token()
		if token == nil {
			return ""
		}

		return result
	default:
		panic("Wrong element type. Supposed to be xml.CharData.")
	}
}

func getArray(decoder *xml.Decoder) []string {
	fmt.Println("Looking at Array ...")

	result := []string{}
	var token xml.Token
	var err error
	for {
		token, err = decoder.Token()
		if token == nil {
			fmt.Println("End of XML file:", err.Error())
			return result
		}

		switch elem := token.(type) {
		case xml.CharData:
			result = append(result, string(elem))
		case xml.EndElement:
			fmt.Println("Array got EndElement")
			return result
		default:
			fmt.Println("Array got strange element")
		}
	}
	
	fmt.Println("Array got Result")
	return result
}
