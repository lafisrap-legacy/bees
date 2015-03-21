	package main

import (
	"encoding/xml"
	"unicode/utf8"
	"golang.org/x/text/unicode/norm"
	"fmt"
	"github.com/codegangsta/cli"
	"os"
	"strings"
	"strconv"
	"regexp"
	"math"
	"sort"
)

type _frame struct {
	x int
	y int
	w int
	h int
} 

type _pos struct {
	x int
	y int
}


var _b_regexNumbers = regexp.MustCompile("[0-9]+")

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

	frames := pList["plist"].(map[string]interface{})["frames"].(map[string]interface{})
	metadata := pList["plist"].(map[string]interface{})["metadata"].(map[string]interface{})
	var max float64 = 0;
	for f := range frames {
		frame := frames[f].(map[string]interface{})["frame"].(_frame)
		max = math.Max(max, float64(frame.h))
	}
	
	// get output file name
	fntFile := c.String("fnt")
	if fntFile == "" {
		fntFile = pFile[:len(pFile)-6] + ".fnt"
	} else if fntFile[len(fntFile)-4:] != ".fnt" {
		fntFile = fntFile + ".fnt"
	}

	fntOutput, err := os.Create(fntFile)
	if err != nil {
		fmt.Println("Couldn't open ", pFile, "(", err.Error(), ")")
		return		
	}
	defer fntOutput.Close()
	
	// create fnt file 
	pos := strings.LastIndex(fntFile, "/")
	if pos == -1 {
		pos = 0
	}
	fntName := fntFile[pos:len(fntFile)-4] 
	if( c.String("name") != "" ) {
		fntName = c.String("name")
	}

	// ... info line ...
	fntOutput.WriteString("info face=\""+fntName+"\" size="+strconv.Itoa(int(max))+" bold=0 italic=0 charset=\"\" unicode=0 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=0,0\n")

	// ... common line ...
	size := metadata["size"].(_pos)
	fntOutput.WriteString("common lineHeight="+strconv.Itoa(int(max*1.16))+" base="+strconv.Itoa(int(max*0.9))+" scaleW="+strconv.Itoa(size.x)+" scaleH="+strconv.Itoa(size.y)+" pages=1 packed=0\n")
	
	// ... page ...
	fntOutput.WriteString("page id=0 file=\""+fntName+".png\"\n")

	// ... chars ...
	fntOutput.WriteString("chars count="+strconv.Itoa(len(frames))+"\n")

	// ... char ...
	var keys []string
	for k := range frames {
		keys = append(keys,string(k))
	}
	sort.Strings(keys)
	for f := range keys {
		frame := frames[keys[f]].(map[string]interface{})
		x := frame["frame"].(_frame).x
		y := frame["frame"].(_frame).y
		w := frame["sourceSize"].(_pos).x
		h := frame["sourceSize"].(_pos).y
		fntOutput.WriteString("char id="+getUnicode(keys[f])+" x="+strconv.Itoa(x)+" y="+strconv.Itoa(y)+" width="+strconv.Itoa(w)+" height="+strconv.Itoa(h)+" xoffset="+strconv.Itoa(int(max/4))+" yoffset="+strconv.Itoa(150-h)+" xadvance="+strconv.Itoa(w)+" page=0 chnl=0\n")
	}
}

func readToken(decoder *xml.Decoder, storage map[string]interface{}, key string) {

	for {
		token, _ := decoder.Token()
		if token == nil {
			return
		}

		switch elem := token.(type) {
		case xml.StartElement:
			name := elem.Name.Local
			switch name {
			case "plist":
				key = "plist"
			case "dict":
				newMap := make(map[string]interface{})
				storage[key] = newMap
				readToken(decoder, newMap, "")
			case "key":
				key = getElement(decoder)
			case "string":
				str := getElement(decoder)
				switch key {
				case "frame":
					fallthrough
				case "sourceColorRect":
					var data _frame
					arr := _b_regexNumbers.FindAllString(str, -1)
					data.x, _ = strconv.Atoi(arr[0])
					data.y, _ = strconv.Atoi(arr[1])
					data.w, _ = strconv.Atoi(arr[2])
					data.h, _ = strconv.Atoi(arr[3])
					storage[key] = data
				case "offset":
					fallthrough
				case "size":
					fallthrough
				case "sourceSize":
					var data _pos
					arr := _b_regexNumbers.FindAllString(str, -1)
					data.x, _ = strconv.Atoi(arr[0])
					data.y, _ = strconv.Atoi(arr[1])					 
					storage[key] = data
				default:
					storage[key] = str 					
				}
			case "integer":
				storage[key] = getElement(decoder)
			case "false":
				storage[key] = false
			case "true":
				storage[key] = true
			case "array":
				storage[key] = getArray(decoder)
			default:
			}
		case xml.EndElement:
			name := elem.Name.Local
			if name == "dict" || name == "plist" {
				return
			}
		case xml.CharData:
		default:
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
	result := []string{}
	var token xml.Token
	for {
		token, _ = decoder.Token()
		if token == nil {
			return result
		}

		switch elem := token.(type) {
		case xml.CharData:
			result = append(result, string(elem))
		case xml.EndElement:
			return result
		default:
		}
	}
	
	return result
}

func getUnicode(char string) string {
	if( len(char) >= 4 ) {
		switch(char) {
		case "ampersand":
			char = "&"
		case "bracketopen":
			char = "("
		case "bracketclose":
			char = ")"
		case "comma1":
			char = ","
		case "comma2":
			char = ","
		case "exclamation":
			char = "!"
		case "hash":
			char = "#"
		case "minus":
			char = "-"
		case "percent":
			char = "%"
		case "plus":
			char = "+"
		case "point":
			char = "."
		case "quotation":
			char = "?"
		case "slash":
			char = "/"
		case "star":
			char = "*"			
		case "space":
			char = " "			
		default:
			fmt.Println("Character name "+char+" not found. Take it as normal character.")
		}
	}

	// nomalized encoding of arbitrary UTF-8 strings (!)
	rune, _ := utf8.DecodeRuneInString(string(norm.NFC.Bytes([]byte(char))))
	
	return strconv.Itoa(int(rune))
}
