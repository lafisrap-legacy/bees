package main

import (
	"encoding/json"
	"encoding/xml"
	"fmt"
	"github.com/codegangsta/cli"
	"golang.org/x/text/unicode/norm"
	"io/ioutil"
	"math"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"unicode/utf8"
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

type fntInfo struct {
	Face     string
	Size     string
	Bold     string
	Italic   string
	Charset  string
	Unicode  string
	StretchH string
	Smooth   string
	Aa       string
	Padding  string
	Spacing  string
	Outline  string
}

type fntCommon struct {
	LineHeight string
	Base       string
	ScaleW     string
	ScaleH     string
	Pages      string
	Packed     string
	AlphaChnl  string
	RedChnl    string
	GreenChnl  string
	BlueChnl   string
}

type fntChar struct {
	Char	 string
	Id       string
	X        string
	Y        string
	Width    string
	Height   string
	Xoffset  string
	Yoffset  string
	Xadvance string
	Page     string
	Chnl     string
}

type fntKerning struct {
	First	string
	Second	string
	Amount	string
}

type jsonInputFmt struct {
	Info   fntInfo
	Common fntCommon
	Char   map[string]fntChar
	Kerning []fntKerning
}

var _b_regexNumbers = regexp.MustCompile("[0-9]+")

func createFont(c *cli.Context) {
	// get input file name
	pFile := c.String("plist")
	if pFile == "" {
		fmt.Println("Specify a plist file name for input.")
		fmt.Println("")
		fmt.Println("HINT:")
		fmt.Println("Createfont needs a plist-cocos2d file as input. It can be created with")
		fmt.Println("programs like Sprite Master. As additional input file there is a json file,")
		fmt.Println("with the same name, which contains special measures and offsets. If there")
		fmt.Println("is no such file, createfont creates it for you. Just insert your changes")
		fmt.Println("and run createfont again.")
		fmt.Println("")
	} else {
		if pFile[len(pFile)-6:] != ".plist" {
			pFile = pFile + ".plist"
		}
	}

	// open plist file
	pInput, err := os.Open(pFile)
	if err != nil {
		fmt.Println("Couldn't open file (", pFile, ")")
		return
	}
	defer pInput.Close()
	
	pos := strings.LastIndex(pFile, "/")
	if pos == -1 {
		pos = 0
	}
	fontName := pFile[pos : len(pFile)-6]
	fmt.Println("Fontname:", fontName)

	// retrieve XML
	pList := make(map[string]interface{})
	decoder := xml.NewDecoder(pInput)

	readToken(decoder, pList, "main")

	var plistData jsonInputFmt
	frames := pList["plist"].(map[string]interface{})["frames"].(map[string]interface{})
	metadata := pList["plist"].(map[string]interface{})["metadata"].(map[string]interface{})

	char := make(map[string]fntChar)
	var max float64 = 0
	for f := range frames {
		rune := getUnicode(f)
		frame := frames[f].(map[string]interface{})["frame"].(_frame)
		offset := frames[f].(map[string]interface{})["offset"].(_pos)
		char[rune] = fntChar{
			Char:	  f,
			Id:       rune,
			X:        strconv.Itoa(frame.x),
			Y:        strconv.Itoa(frame.y),
			Width:    strconv.Itoa(frame.w),
			Height:   strconv.Itoa(frame.h),
			Xoffset:  strconv.Itoa(offset.x),
			Yoffset:  strconv.Itoa(offset.y),
			Xadvance: strconv.Itoa(frame.w),
			Page:     "0",
			Chnl:     "0",
		}

		max = math.Max(max, float64(frame.h))
	}

	plistData = jsonInputFmt{
		Info: fntInfo{
			Face:     "",
			Size:     strconv.Itoa(int(max)),
			Bold:     "0",
			Italic:   "0",
			Charset:  "",
			Unicode:  "0",
			StretchH: "100",
			Smooth:   "1",
			Aa:       "1",
			Padding:  "0,0,0,0",
			Spacing:  "0,0",
			Outline:  "0",
		},
		Common: fntCommon{
			LineHeight: strconv.Itoa(int(max*1.16)),
			Base:       strconv.Itoa(int(max*0.90)),
			ScaleW:     strconv.Itoa(metadata["size"].(_pos).x),
			ScaleH:     strconv.Itoa(metadata["size"].(_pos).y),
			Pages:      "1",
			Packed:     "0",
			AlphaChnl:  "",
			RedChnl:    "",
			GreenChnl:  "",
			BlueChnl:   "",
		},
		Char: char,
	}

	// open json file
	jsonFilename := c.String("json")
	if jsonFilename == "" {
		jsonFilename = pFile[:len(pFile)-6] + ".json"
	} else if jsonFilename[len(jsonFilename)-5:] != ".json" {
		jsonFilename = jsonFilename + ".json"
	}
	
	var jsonData jsonInputFmt
	tFile := c.String("template")
	jsonInput, err := ioutil.ReadFile(jsonFilename)
	if err != nil {
		jsonFile, err := os.Create(jsonFilename)
		if err != nil {
			fmt.Println("Couldn't create ", jsonFile, "(", err.Error(), ")")
			return
		}
		
		if tFile == "" {
			// fill some font specific information into the json template	
			err = json.Unmarshal([]byte(createfont_json_template), &jsonData)
			if err != nil {
				fmt.Println("Error while reading json template: ", err.Error())
				return
			}

			jsonData.Info.Face = fontName
			jsonData.Info.Size = strconv.Itoa(int(max))
		
			for i := range jsonData.Char {
				jChar := jsonData.Char[i]
				pChar := plistData.Char[i]
				height, _ := strconv.Atoi(pChar.Height)
				jChar.Yoffset = strconv.Itoa( int(max) - height )
				jChar.Xadvance = pChar.Width
				jsonData.Char[i] = jChar
			}
			fmt.Println("Creating", jsonFilename, "...")
			fmt.Println("Please enter your modifications into the file and run 'beest createfont' again.")
			fmt.Println("First you might want to adjust the Yoffset parameter of every character to adjust the height.")
			fmt.Println("The fnt file was created anyway, so you can test the font.")
		} else {
			jsonInput, err := ioutil.ReadFile(tFile)
			if err != nil {
				fmt.Println("Couldn't read template file ", jsonInput, "(", err.Error(), ")")
				return		
			}
			err = json.Unmarshal(jsonInput, &jsonData)
			if err != nil {
				fmt.Println("Error while unmarshalling json template file ",tFile,":", err.Error())
				return
			}
			// Now resize all size values
			if jsonData.Info.Size == "" {
				fmt.Println( "Template Info.Size parameter is \"\". It must have a value.")
				return
			}
			oldSize, _ := strconv.ParseFloat(jsonData.Info.Size,64)
			newSize := max
			if newSize > oldSize {
				fmt.Println("The target font size is larger than the template font size. Choose a larger template.")
				return
			}
			ratio := newSize / oldSize;

			jsonData.Info.Face = fontName
			jsonData.Info.Size = strconv.Itoa(int(max))

			for c := range jsonData.Char {
				char := jsonData.Char[c]
				
				if char.Xoffset != "" {
					newf, _ :=strconv.ParseFloat(char.Xoffset,64)
					char.Xoffset = strconv.Itoa(int(newf*ratio))
				}
				if char.Yoffset != "" {
					newf, _ :=strconv.ParseFloat(char.Yoffset,64)
					char.Yoffset = strconv.Itoa(int(newf*ratio))
				}
				if char.Xadvance != "" {
					newf, _ :=strconv.ParseFloat(char.Xadvance,64)
					char.Xadvance = strconv.Itoa(int(newf*ratio))
				}
				
				jsonData.Char[c] = char
			}
			for c := 0 ; c < len(jsonData.Kerning) ; c++ {
				pair := jsonData.Kerning[c]
				
				if pair.Amount != "" {
					newf, _ :=strconv.ParseFloat(pair.Amount,64)
					pair.Amount = strconv.Itoa(int(newf*ratio))
				}
				
				jsonData.Kerning[c] = pair
			}			
		}
		
		jsonStr, _ := json.MarshalIndent(jsonData, "  ", "    ")
		jsonFile.WriteString(string(jsonStr))

	} else if tFile != "" {
		fmt.Println("A json file already exists. Delete it before you use a template for a new file.")
		return		
	} else {
		err = json.Unmarshal(jsonInput, &jsonData)
		if err != nil {
			fmt.Println("Error while reading json file: ", err.Error())
			return
		}
	}

	// get fnt output file name
	fntFile := c.String("fnt")
	if fntFile == "" {
		fntFile = pFile[:len(pFile)-6] + ".fnt"
	} else if fntFile[len(fntFile)-4:] != ".fnt" {
		fntFile = fntFile + ".fnt"
	}

	fntOutput, err := os.Create(fntFile)
	if err != nil {
		fmt.Println("Couldn't create ", fntFile, "(", err.Error(), ")")
		return
	}
	defer fntOutput.Close()

	// copy data from jsonFile if there are modifications
	pInfo := plistData.Info
	jInfo := jsonData.Info
	pInfo.Face = nonBlank(pInfo.Face, jInfo.Face)
	pInfo.Size = nonBlank(pInfo.Size, jInfo.Size)
	pInfo.Bold = nonBlank(pInfo.Bold, jInfo.Bold)
	pInfo.Italic = nonBlank(pInfo.Italic, jInfo.Italic)
	pInfo.Charset = nonBlank(pInfo.Charset, jInfo.Charset)
	pInfo.Unicode = nonBlank(pInfo.Unicode, jInfo.Unicode)
	pInfo.StretchH = nonBlank(pInfo.StretchH, jInfo.StretchH)
	pInfo.Smooth = nonBlank(pInfo.Smooth, jInfo.Smooth)
	pInfo.Aa = nonBlank(pInfo.Aa, jInfo.Aa)
	pInfo.Padding = nonBlank(pInfo.Padding, jInfo.Padding)
	pInfo.Spacing = nonBlank(pInfo.Spacing, jInfo.Spacing)
	pInfo.Outline = nonBlank(pInfo.Outline, jInfo.Outline)

	pCommon := plistData.Common
	jCommon := jsonData.Common
	pCommon.LineHeight = nonBlank(pCommon.LineHeight, jCommon.LineHeight)
	pCommon.Base = nonBlank(pCommon.Base, jCommon.Base)
	pCommon.ScaleW = nonBlank(pCommon.ScaleW, jCommon.ScaleW)
	pCommon.ScaleH = nonBlank(pCommon.ScaleH, jCommon.ScaleH)
	pCommon.Pages = nonBlank(pCommon.Pages, jCommon.Pages)
	pCommon.Packed = nonBlank(pCommon.Packed, jCommon.Packed)
	pCommon.AlphaChnl = nonBlank(pCommon.AlphaChnl, jCommon.AlphaChnl)
	pCommon.RedChnl = nonBlank(pCommon.RedChnl, jCommon.RedChnl)
	pCommon.GreenChnl = nonBlank(pCommon.GreenChnl, jCommon.GreenChnl)
	pCommon.BlueChnl = nonBlank(pCommon.BlueChnl, jCommon.BlueChnl)

	pChar := plistData.Char
	jChar := jsonData.Char
	for i := range jChar {

		var ch fntChar
		
		ch.Id = nonBlank(pChar[i].Id, jChar[i].Id)
		ch.X = nonBlank(pChar[i].X, jChar[i].X)
		ch.Y = nonBlank(pChar[i].Y, jChar[i].Y)
		ch.Width = nonBlank(pChar[i].Width, jChar[i].Width)
		ch.Height = nonBlank(pChar[i].Height, jChar[i].Height)
		ch.Xoffset = nonBlank(pChar[i].Xoffset, jChar[i].Xoffset)
		ch.Yoffset = nonBlank(pChar[i].Yoffset, jChar[i].Yoffset)
		ch.Xadvance = nonBlank(pChar[i].Xadvance, jChar[i].Xadvance)
		ch.Page = nonBlank(pChar[i].Page, jChar[i].Page)
		ch.Chnl = nonBlank(pChar[i].Chnl, jChar[i].Chnl)

		pChar[i] = ch		
	}
		
	// ... info line ...
	fntOutput.WriteString("info face=\"" + fontName + "\" size=" + plistData.Info.Size + " bold=" + plistData.Info.Bold + " italic=" + plistData.Info.Italic + " charset=\"" + plistData.Info.Charset + "\" unicode=" + plistData.Info.Unicode + " stretchH=" + plistData.Info.StretchH + " smooth=" + plistData.Info.Smooth + " aa=" + plistData.Info.Aa + " padding=" + plistData.Info.Padding + " spacing=" + plistData.Info.Spacing + "\n")

	// ... common line ...
	fntOutput.WriteString("common lineHeight=" + plistData.Common.LineHeight + " base=" + plistData.Common.Base + " scaleW=" + plistData.Common.ScaleW + " scaleH=" + plistData.Common.ScaleH + " pages=" + plistData.Common.Pages + " packed=" + plistData.Common.Packed + "\n")

	// ... page ...
	fntOutput.WriteString("page id=0 file=\"" + fontName + ".png\"\n")

	// ... chars ...
	fntOutput.WriteString("chars count=" + strconv.Itoa(len(frames)) + "\n")

	// ... char ...
	var keys []int
	for k := range plistData.Char {
		runeStr, _ := strconv.Atoi(k)
		keys = append(keys, runeStr)
	}
	sort.Ints(keys)
	for c := range plistData.Char {
		fntOutput.WriteString("char id=" + c + " x=" + plistData.Char[c].X + " y=" + plistData.Char[c].Y + " width=" + plistData.Char[c].Width + " height=" + plistData.Char[c].Height + " xoffset=" + plistData.Char[c].Xoffset + " yoffset=" + plistData.Char[c].Yoffset + " xadvance=" + plistData.Char[c].Xadvance + " page=" + plistData.Char[c].Page + " chnl=" + plistData.Char[c].Chnl + "\n")
		//fmt.Println( "\""+getUnicode(keys[f])+"\":{\"char\": \""+keys[f]+"\",\"id\": \""+getUnicode(keys[f])+"\",\"x\": \"\",\"y\": \"\",\"width\": \"\",\"height\": \"\",\"xoffset\": \"\",\"yoffset\": \"\",\"xadvance\": \"\",\"page\": \"\",\"chnl\": \"\"},");
	}
	
	// ... kerning ...
	for i:=0 ; i<len(jsonData.Kerning) ; i++ {
		k := jsonData.Kerning[i]
		fntOutput.WriteString("kerning first=" + k.First + " second=" + k.Second + " amount=" + k.Amount + "\n")
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
	//fmt.Println("Character name "+char+" found.")			

	if len(char) >= 4 {
		switch char {
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
			//fmt.Println("Character name " + char + " not found. Take it as normal character.")
		}
	}

	// nomalized encoding of arbitrary UTF-8 strings (!)
	rune, _ := utf8.DecodeRune(norm.NFC.Bytes([]byte(char)))

	return strconv.Itoa(int(rune))
}

func nonBlank(plist, json string) string {
	if json != "" {
		return json
	} else {
		return plist
	}
}
